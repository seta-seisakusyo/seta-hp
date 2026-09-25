import { Box } from "@mui/material";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getPrismaClient } from "@/lib/db";
import { CACHE_REVALIDATE_SECONDS, CACHE_TAGS } from "@/lib/cache-tags";
import ProductsGrid from "./_components/ProductsGrid";
import PageHero from "@/components/PageHero";
import DarkCtaSection from "@/components/DarkCtaSection";
import { getPrimaryProductImage } from "@/lib/types/product";

// searchParams（カテゴリ・ソート）に依存するため動的レンダリング。
// 公開商品の取得は unstable_cache（products タグ）でキャッシュし、絞り込みはメモリ上で行う。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue / 商品一覧",
  description:
    "MLBカード・野球カードコレクター向けアクリルディスプレイの商品一覧。8枚・16枚・25枚の壁面展示モデルやオーダーメイドに対応。",
  alternates: { canonical: "/products" },
};

// 公開商品の全件取得（新着順）。商品の書き込み時に products タグで無効化される。
const getPublishedProducts = unstable_cache(
  async () => {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, category: true, price: true, tags: true, images: true },
      orderBy: { createdAt: "desc" },
    });
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      tags: product.tags,
      image: getPrimaryProductImage(product.images),
    }));
  },
  ["published-products"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAGS.products] }
);

async function getProducts(category?: string, sort?: string) {
  const products = await getPublishedProducts();
  const filtered = category ? products.filter((p) => p.category === category) : products;

  if (sort === "price-asc") return [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...filtered].sort((a, b) => b.price - a.price);
  return filtered; // 取得時点で新着順
}

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, sort } = await searchParams;
  const products = await getProducts(category, sort);

  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      <PageHero
        eyebrow="Catalogue · 商品一覧"
        heading="カタログ"
        subtitle="— Built for collectors who actually display their cards."
        statsWrap
        stats={[
          { value: products.length, label: "Products listed" },
          { value: "100%", label: "Hand-finished" },
        ]}
      />
      <ProductsGrid products={products} />
      <DarkCtaSection
        heading={
          <>
            既製品にない、<br />
            <em>あなただけの一品。</em>
          </>
        }
        body="50枚以上の大型システム、AWARD HISTORY のような特注品、サイズ・形状のカスタマイズなど、お気軽にご相談ください。一品からお作りします。"
        primaryLabel="特注品のご相談"
        secondaryHref="/gallery"
        secondaryLabel="制作事例を見る"
      />
    </Box>
  );
}
