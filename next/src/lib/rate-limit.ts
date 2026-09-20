import type { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { rateLimitResponse } from "@/lib/api-response";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

let storeFallbackWarned = false;

declare global {
  // eslint-disable-next-line no-var
  var __setaRateLimitCleanupStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __setaRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

// dev HMRでモジュールが再評価されてもストアとクリーンアップの対応が崩れないようglobalThisに保持
const rateLimitStore =
  globalThis.__setaRateLimitStore ?? (globalThis.__setaRateLimitStore = new Map());

function ensureMemoryCleanupStarted() {
  if (globalThis.__setaRateLimitCleanupStarted) return;

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);

  interval.unref?.();
  globalThis.__setaRateLimitCleanupStarted = true;
}

ensureMemoryCleanupStarted();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function resolveRateLimitStore(): "memory" | "database" {
  const configuredStore = process.env.RATE_LIMIT_STORE;
  if (configuredStore === "memory") return "memory";
  if (configuredStore === "database") return "database";
  if (process.env.NODE_ENV === "test") return "memory";
  return process.env.DATABASE_URL ? "database" : "memory";
}

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  if (entry.count < config.limit) {
    entry.count++;
    return {
      success: true,
      remaining: config.limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

async function maybeCleanupExpiredRateLimits(now: Date) {
  if (Math.random() >= 0.01) return;

  try {
    const prisma = getPrismaClient();
    await prisma.$executeRaw`DELETE FROM ApiRateLimit WHERE resetAt < ${now}`;
  } catch {
    // ベストエフォートの掃除なので失敗は握りつぶす
  }
}

async function checkDatabaseRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const prisma = getPrismaClient();
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowMs);

  await maybeCleanupExpiredRateLimits(now);

  await prisma.$executeRaw`
    INSERT INTO ApiRateLimit (identifier, count, resetAt)
    VALUES (${key}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      count = IF(resetAt < NOW(), 1, count + 1),
      resetAt = IF(resetAt < NOW(), ${resetAt}, resetAt)
  `;

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    SELECT count, resetAt
    FROM ApiRateLimit
    WHERE identifier = ${key}
    LIMIT 1
  `;
  const entry = rows[0];

  if (!entry) {
    throw new Error("Rate limit entry was not created");
  }

  const success = entry.count <= config.limit;
  const remaining = success ? Math.max(config.limit - entry.count, 0) : 0;

  return {
    success,
    remaining,
    resetAt: new Date(entry.resetAt).getTime(),
  };
}

function logStoreFallback(error: unknown) {
  if (storeFallbackWarned) return;
  storeFallbackWarned = true;
  console.warn("DBレート制限が利用できないため、インメモリ方式へフォールバックします", error);
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const store = resolveRateLimitStore();

  if (store === "memory") {
    return checkMemoryRateLimit(key, config);
  }

  try {
    return await checkDatabaseRateLimit(key, config);
  } catch (error) {
    logStoreFallback(error);
    return checkMemoryRateLimit(key, config);
  }
}

export function getClientIp(request: Request): string {
  // nginx は X-Real-IP を接続元IP($remote_addr)で常に上書きするため最優先で信頼する。
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // X-Forwarded-For の先頭要素はクライアントが自由に詐称でき、per-IP レート制限を無効化できる。
  // nginx($proxy_add_x_forwarded_for)は実IPを末尾に追記するので、最後の要素を採用する。
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "unknown";
}

/**
 * レート制限の適用を1箇所に集約したヘルパ。
 * 超過時は 429 レスポンス、通過時は null と結果（成功ヘッダ用）を返す。
 *
 * 使い方:
 *   const { limited, result } = await enforceRateLimit(req, "contact", RATE_LIMITS.contact);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  request: Request,
  keyPrefix: string,
  config: RateLimitConfig,
  message?: string
): Promise<{ limited: NextResponse | null; result: RateLimitResult }> {
  const clientIp = getClientIp(request);
  const result = await checkRateLimit(`${keyPrefix}:${clientIp}`, config);

  if (result.success) {
    return { limited: null, result };
  }

  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return { limited: rateLimitResponse(retryAfter, result.resetAt, message), result };
}

export const RATE_LIMITS = {
  register: {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  },
  login: {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
  // 単一IPから多数アカウントを試すパスワードスプレー対策（アカウント単位より緩め）
  loginIp: {
    limit: 30,
    windowMs: 15 * 60 * 1000,
  },
  contact: {
    limit: 3,
    windowMs: 60 * 1000,
  },
  recaptcha: {
    limit: 5,
    windowMs: 60 * 1000,
  },
  // 社内レビューコメント（書き込み系）
  review: {
    limit: 30,
    windowMs: 60 * 1000,
  },
  // 社内レビューコメント（ステータス切替は頻度が高め）
  reviewUpdate: {
    limit: 60,
    windowMs: 60 * 1000,
  },
  // X への手動投稿。従量課金のため、誤操作や連打がそのまま課金になる。
  // 管理者しか叩けないので緩めだが、無制限にはしない。
  xPost: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },
} as const;
