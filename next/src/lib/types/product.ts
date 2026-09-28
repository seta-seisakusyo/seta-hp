import type { Product as PrismaProduct } from "@prisma/client";
import { normalizeImageUrl } from "@/lib/images";

// DB直取得（Date）とAPIレスポンス（ISO文字列）の両方を受けつつ、
// モデルのフィールド追加・変更はPrisma型へ追従する。
export type Product = Omit<PrismaProduct, "createdAt" | "updatedAt">;

export interface ProductSummary {
  id: number;
  name: string;
  price: number;
  image: string | null;
}

export interface ProductGridItem extends ProductSummary {
  category: string;
  tags: string;
}

export function parseTags(tagString: string | null | undefined): string[] {
  return tagString ? tagString.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

export function parseProductImages(images: unknown): string[] {
  if (Array.isArray(images) && images.every((i) => typeof i === "string")) {
    return images.map((img) => normalizeImageUrl(img)).filter((img): img is string => Boolean(img));
  }
  return [];
}

export interface PurchaseLink {
  /** 購入先の表示名（BASE / Amazon） */
  store: string;
  href: string;
}

/** 商品に設定された外部の購入先。BASE を先頭に、設定済みのものだけ返す。 */
export function getPurchaseLinks(
  product: Pick<PrismaProduct, "purchaseUrl" | "amazonUrl">
): PurchaseLink[] {
  const links: PurchaseLink[] = [];
  if (product.purchaseUrl) links.push({ store: "BASE", href: product.purchaseUrl });
  if (product.amazonUrl) links.push({ store: "Amazon", href: product.amazonUrl });
  return links;
}

/** スリーブ1種類（名前・メーカー・寸法・画像） */
export interface ProductSleeveItem {
  name: string;
  maker: string | null;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  /** 画像（/uploads/...）。先頭が代表画像 */
  images: string[];
}

/** 対応スリーブ（DB の Product.sleeve。書き込み時に productSleeveSchema で検証済み） */
export interface ProductSleeve extends ProductSleeveItem {
  count: number | null;
  /** お客様がスリーブをお持ちで「スリーブなし」を選んだ場合の値引き額（円） */
  discount: number | null;
  /** 同じ枠に入るほかのスリーブ（付属はしない。お手持ちのスリーブを使う案内用） */
  alternatives: ProductSleeveItem[];
}

const optionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Product.sleeve（JSON）を表示用に読み取る。名前がなければ未登録として null。
 * クライアントでも使うため zod には頼らず、型の合わない項目は null として扱う。
 */
function parseSleeveItem(value: unknown): ProductSleeveItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name) return null;
  return {
    name: record.name,
    maker: typeof record.maker === "string" && record.maker ? record.maker : null,
    widthMm: optionalNumber(record.widthMm),
    heightMm: optionalNumber(record.heightMm),
    thicknessMm: optionalNumber(record.thicknessMm),
    // 画像と複数対応より前に保存したスリーブは images を持たない。
    images: parseProductImages(record.images),
  };
}

export function parseProductSleeve(value: unknown): ProductSleeve | null {
  const item = parseSleeveItem(value);
  if (!item) return null;
  const record = value as Record<string, unknown>;
  return {
    ...item,
    count: optionalNumber(record.count),
    discount: optionalNumber(record.discount),
    alternatives: Array.isArray(record.alternatives)
      ? record.alternatives.map(parseSleeveItem).filter((alt): alt is ProductSleeveItem => alt !== null)
      : [],
  };
}

/** 対応スリーブ（保存値）が参照している画像（代表・ほかの対応スリーブの両方）。 */
export function collectSleeveImageUrls(value: unknown): string[] {
  const sleeve = parseProductSleeve(value);
  if (!sleeve) return [];
  return [...sleeve.images, ...sleeve.alternatives.flatMap((alt) => alt.images)];
}

/** 商品名をお問い合わせフォームへ引き継ぐURL */
export function getProductInquiryHref(productName: string): string {
  return `/contact?product=${encodeURIComponent(productName)}`;
}

export function getPrimaryProductImage(images: unknown): string | null {
  return parseProductImages(images)[0] ?? null;
}
