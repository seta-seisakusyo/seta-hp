import { DATABASE_INT_MAX } from "./db-limits";
import { parsePositiveId } from "./parse-id";

const DEFAULT_LIMIT = 50;

/**
 * ページネーションパラメータのパース・バリデーション
 * page指定時はデフォルトlimitを適用、両方未指定なら全件取得
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number | undefined;
  skip: number | undefined;
} {
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  // どちらも未指定なら全件返却（既存フロント互換）
  if (!pageParam && !limitParam) {
    return { page: 1, limit: undefined, skip: undefined };
  }

  const limit = Math.min(parsePositiveId(limitParam) ?? DEFAULT_LIMIT, 100);
  const requestedPage = parsePositiveId(pageParam) ?? 1;
  // page自体が範囲内でも乗算結果がDBの整数範囲を超える場合がある。
  const page = requestedPage <= Math.floor(DATABASE_INT_MAX / limit) + 1 ? requestedPage : 1;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
