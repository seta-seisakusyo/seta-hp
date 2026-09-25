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

/** 商品名をお問い合わせフォームへ引き継ぐURL */
export function getProductInquiryHref(productName: string): string {
  return `/contact?product=${encodeURIComponent(productName)}`;
}

export function getPrimaryProductImage(images: unknown): string | null {
  return parseProductImages(images)[0] ?? null;
}
