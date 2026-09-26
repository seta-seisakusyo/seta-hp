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

/** 対応スリーブ（DB の Product.sleeve。書き込み時に productSleeveSchema で検証済み） */
export interface ProductSleeve {
  name: string;
  maker: string | null;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  count: number | null;
  /** お客様がスリーブをお持ちで「スリーブなし」を選んだ場合の値引き額（円） */
  discount: number | null;
}

const optionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Product.sleeve（JSON）を表示用に読み取る。名前がなければ未登録として null。
 * クライアントでも使うため zod には頼らず、型の合わない項目は null として扱う。
 */
export function parseProductSleeve(value: unknown): ProductSleeve | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name) return null;
  return {
    name: record.name,
    maker: typeof record.maker === "string" && record.maker ? record.maker : null,
    widthMm: optionalNumber(record.widthMm),
    heightMm: optionalNumber(record.heightMm),
    thicknessMm: optionalNumber(record.thicknessMm),
    count: optionalNumber(record.count),
    discount: optionalNumber(record.discount),
  };
}

/** 商品名をお問い合わせフォームへ引き継ぐURL */
export function getProductInquiryHref(productName: string): string {
  return `/contact?product=${encodeURIComponent(productName)}`;
}

export function getPrimaryProductImage(images: unknown): string | null {
  return parseProductImages(images)[0] ?? null;
}
