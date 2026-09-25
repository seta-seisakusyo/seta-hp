// DB の列長（VARCHAR）と揃える。管理画面（クライアント）からも使うので validation.ts から分けている。
export const SEO_KEYWORDS_MAX = 512;
export const META_DESCRIPTION_MAX = 320;

/** 保存形式（カンマ区切り）の SEO キーワードを配列にする。空・未設定は空配列。 */
export function splitSeoKeywords(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((keyword) => keyword.trim()).filter(Boolean);
}
