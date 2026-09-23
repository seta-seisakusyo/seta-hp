/**
 * 社内レビューコメント API の有効化ガード
 *
 * UI 側 (layout.tsx) と同じ NEXT_PUBLIC_ENABLE_COMMENTS フラグで API も完全に閉じる。
 * 本番デプロイ時は環境変数を設定しないことで、エンドポイント自体が 404 を返す。
 */

import { parsePositiveId } from "@/lib/parse-id";
import { NextResponse } from "next/server";
import { badRequestResponse } from "@/lib/api-response";
import type { RateLimitConfig } from "@/lib/rate-limit";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export function reviewCommentsDisabledResponse(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_COMMENTS !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return null;
}

/** 書き込みAPI共通の有効化フラグ・レート制限ガード。 */
export async function reviewWriteGuard(
  req: Request,
  config: RateLimitConfig = RATE_LIMITS.review
): Promise<NextResponse | null> {
  const disabled = reviewCommentsDisabledResponse();
  if (disabled) return disabled;

  const pathname = new URL(req.url).pathname;
  const { limited } = await enforceRateLimit(req, `review:${pathname}`, config);
  return limited;
}

/**
 * 書き込みガードとパスパラメータのID検証をまとめて実行する。
 */
export async function parseGuardedReviewId(
  req: Request,
  params: Promise<{ id: string }>,
  config?: RateLimitConfig
): Promise<number | NextResponse> {
  const blocked = await reviewWriteGuard(req, config);
  if (blocked) return blocked;

  const { id: rawId } = await params;
  const id = parsePositiveId(rawId);
  return id ?? badRequestResponse("invalid id");
}
