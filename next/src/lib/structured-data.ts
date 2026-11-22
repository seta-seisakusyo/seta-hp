import { parseProductImages, type Product } from "@/lib/types/product";
import { getStockMeta } from "@/lib/constants/categories";
import { formatRefNumber } from "@/lib/format";
import {
  CONTACT_EMAIL,
  LOGO_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_READING,
  SITE_URL,
  X_PROFILE_URL,
} from "@/lib/site-config";

// 相対パス（/uploads/...）を絶対URLに変換する。外部URLはそのまま。
function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * サイト運営者を表す schema.org/Organization 構造化データ。ルートレイアウトで全ページに埋め込む。
 */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: SITE_NAME_READING,
    url: SITE_URL,
    logo: toAbsoluteUrl(LOGO_PATH),
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    sameAs: [X_PROFILE_URL],
  };
}

/**
 * 商品ページ用 schema.org/Product 構造化データを生成する。
 * 検索結果に価格・在庫を表示させ、リッチリザルトの対象にする。
 */
export function buildProductJsonLd(product: Product): Record<string, unknown> {
  const images = parseProductImages(product.images).map(toAbsoluteUrl);
  const url = `${SITE_URL}/products/${product.id}`;
  // 在庫表示文字列 → schema.org availability。未知の値は「在庫あり」とみなす（InStock）。
  const availability = getStockMeta(product.stock)?.schemaUrl ?? "https://schema.org/InStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(images.length > 0 ? { image: images } : {}),
    sku: formatRefNumber(product.id),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "JPY",
      price: product.price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

/**
 * 商品ページ用 schema.org/BreadcrumbList 構造化データを生成する。
 * 階層は ProductDetail の表示パンくず（Home / Catalogue / Ref. NNN）と同じ3段だが、
 * 名前は検索結果に出す前提で日本語の「ホーム / 商品一覧 / 商品名」にしており、表示とは一致しない。
 */
export function buildBreadcrumbJsonLd(product: Product): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "商品一覧", item: `${SITE_URL}/products` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${SITE_URL}/products/${product.id}`,
      },
    ],
  };
}
