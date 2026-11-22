import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

export interface PageMetadataInput {
  /**
   * ページの題名。文字列ならルートレイアウトの template で「<題名> | 飾Love」になる。
   * トップページのように template を付けない場合は `{ absolute }` で渡す。
   */
  title: string | { absolute: string };
  /** 説明文。省略時は meta description を出さず（ルートの既定値を使う）、OG には SITE_DESCRIPTION を使う */
  description?: string;
  /** サイト内のパス（先頭は "/"）。canonical と og:url に使う */
  path: string;
  /** OG・X カードの画像。省略時は DEFAULT_OG_IMAGE */
  image?: string;
  /** true なら検索に載せない。canonical は出さない */
  noindex?: boolean;
}

/**
 * ページごとのメタデータ（題名・説明・canonical・OG・X カード）を組み立てる。
 *
 * Next.js はメタデータをキー単位で浅く統合するため、openGraph / twitter を
 * ページ側で丸ごと指定しないとルートレイアウトの値がそのまま出る。各ページは
 * この関数を通して、自分の URL・題名・説明を OG まで含めて出力する。
 * なお title.template は openGraph / twitter の題名には適用されないので、
 * それらには「<題名> | 飾Love」を組み立てて渡す。
 */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
}: PageMetadataInput): Metadata {
  const fullTitle = typeof title === "string" ? `${title} | ${SITE_NAME}` : title.absolute;
  const url = `${SITE_URL}${path}`;
  const ogDescription = description ?? SITE_DESCRIPTION;
  const ogImages = image
    ? [image]
    : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }];

  return {
    title,
    ...(description !== undefined ? { description } : {}),
    // noindex のページに canonical を出すと「索引しない」と「正規URLはここ」が矛盾するため出さない
    ...(noindex
      ? { robots: { index: false, follow: false } }
      : { alternates: { canonical: path } }),
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description: ogDescription,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: ogDescription,
      images: [image ?? DEFAULT_OG_IMAGE],
    },
  };
}
