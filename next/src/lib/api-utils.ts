import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import xss from "xss";
import { auth } from "@/lib/auth";
import {
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { isAdminRole, isEditorRole } from "@/lib/roles";

/**
 * 認証と権限をまとめて検証する。
 * 未認証なら401、権限不足なら403のレスポンスを、検証通過ならセッションを返す。
 */
async function requireRole(
  isAllowed: (role: unknown) => boolean,
  forbiddenMessage: string = "権限がありません"
): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }
  if (!isAllowed(session.user.role)) {
    return forbiddenResponse(forbiddenMessage);
  }
  return session;
}

export function requireEditor(): Promise<Session | NextResponse> {
  return requireRole(isEditorRole, "編集権限が必要です");
}

export function requireAdmin(): Promise<Session | NextResponse> {
  return requireRole(isAdminRole, "管理者権限が必要です");
}

/**
 * リクエストボディの JSON パースを安全に行う。
 * 不正な JSON の場合は 400 エラーレスポンスを返す。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody(req: Request): Promise<any | NextResponse> {
  try {
    return await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
}

export async function parseJsonWithSchema<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  const body = await parseJsonBody(req);
  if (isErrorResponse(body)) return body;

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(parsed.error.errors[0].message);
  }
  return parsed.data;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

async function parseAuthorizedJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  authorize: () => Promise<Session | NextResponse>
): Promise<z.infer<T> | NextResponse> {
  const session = await authorize();
  if (isErrorResponse(session)) return session;
  return parseJsonWithSchema(req, schema);
}

/** EDITOR以上の認証とJSONスキーマ検証を一度に行う。 */
export function parseEditorJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  return parseAuthorizedJson(req, schema, requireEditor);
}

/** ADMIN認証とJSONスキーマ検証を一度に行う。 */
export function parseAdminJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  return parseAuthorizedJson(req, schema, requireAdmin);
}

/**
 * タグ入力（配列 or カンマ区切り文字列）をサニタイズ済みのカンマ区切り文字列へ正規化する。
 */
export function sanitizeTags(tags: unknown): string {
  if (Array.isArray(tags)) {
    return tags.map((t) => xss(String(t))).join(",");
  }
  return xss(typeof tags === "string" ? tags : "");
}

/** 任意テキスト: 値があればサニタイズ、なければ undefined（＝更新しない）。 */
export function sanitizeOptionalText(value: string | undefined): string | undefined {
  return value ? xss(value) : undefined;
}

/** null 許容テキスト（作成時）: 空なら null を保存する。 */
export function sanitizeNullableText(value: string | null | undefined): string | null {
  return value ? xss(value) : null;
}

/**
 * null 許容テキスト（更新時）:
 * undefined = キー未送信 → 列を更新しない / null・空文字 = 明示的なクリア → null を保存。
 */
export function sanitizeOptionalNullableText(
  value: string | null | undefined
): string | null | undefined {
  return value !== undefined ? (value ? xss(value) : null) : undefined;
}

/**
 * API ルート共通の catch ハンドラ。
 * - Prisma P2025（更新・削除対象なし） → 404
 * - Prisma P2002（一意制約違反）→ 指定時は既存契約と同じ400
 * - その他 → ログ出力して 500
 */
export function handleApiError(
  error: unknown,
  options: {
    log: string;
    message: string;
    notFoundMessage?: string;
    uniqueConstraintMessage?: string;
  }
): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return notFoundResponse(options.notFoundMessage ?? "対象が見つかりません");
  }
  if (
    options.uniqueConstraintMessage &&
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return badRequestResponse(options.uniqueConstraintMessage);
  }
  console.error(`${options.log}:`, error);
  return internalErrorResponse(options.message);
}
