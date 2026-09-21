const SAME_SITE_IMAGE_HOSTS = new Set([
  "kaza-love.com",
  "www.kaza-love.com",
  "setaseisakusyo.com",
  "www.setaseisakusyo.com",
]);

export function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;

  try {
    const url = new URL(trimmed);
    if (SAME_SITE_IMAGE_HOSTS.has(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * 管理画面から永続ボリュームへ追加された画像かを判定する。
 *
 * 本番の Next.js は起動時に public/ のファイル一覧を固定するため、起動後に
 * public/uploads へ追加された画像を next/image の内部リクエストから参照できない。
 * この画像だけ最適化を迂回し、Nginx の /uploads/ alias から直接配信する。
 */
export function isUploadedImageUrl(value: string | null | undefined): boolean {
  return normalizeImageUrl(value)?.startsWith("/uploads/") ?? false;
}
