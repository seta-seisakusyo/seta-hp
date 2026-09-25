import type { MetadataRoute } from "next";
import { getPrismaClient } from "@/lib/db";
import { SITE_URL } from "@/lib/site-config";

/**
 * サイトマップ（/sitemap.xml）
 *
 * 公開商品ページ（/products/[id]）は force-dynamic のため、ビルド時の静的解析では
 * 検出できない。そこでリクエスト時に DB から公開商品を取得して動的に列挙する。
 * ビルド時（DB 未接続）に評価されないよう force-dynamic を指定する。
 */
export const dynamic = "force-dynamic";

// sitemap に含める公開・インデックス対象の静的ページ
// （/login・/register・各 *-manage・/news・/about は noindex のため除外）
const STATIC_PATHS = [
  "",
  "/products",
  "/gallery",
  "/company",
  "/contact",
  "/shipping",
  "/legal",
  "/privacy-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静的ページは lastModified を付けない。force-dynamic でクロール毎に new Date() を
  // 入れると全 URL の更新日時が毎回変わり、Google に誤った更新シグナルを送るため。
  // （更新日時が意味を持つ商品ページのみ、実際の updatedAt を設定する）
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    productEntries = products.map((product) => ({
      url: `${SITE_URL}/products/${product.id}`,
      lastModified: product.updatedAt,
    }));
  } catch (error) {
    // DB 接続不可時（ビルド時プリレンダ等）でも静的ページのサイトマップは返す
    console.error("sitemap: 公開商品の取得に失敗しました", error);
  }

  return [...staticEntries, ...productEntries];
}
