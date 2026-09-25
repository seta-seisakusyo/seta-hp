import { cache } from "react";
import { notFound } from "next/navigation";
import { Box } from "@mui/material";
import type { Metadata } from "next";
import { parsePositiveId } from "@/lib/parse-id";
import { getPrismaClient } from "@/lib/db";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { serializeJsonLd } from "@/lib/json-ld";
import ProductDetail from "./_components/ProductDetail";
import RelatedProducts from "./_components/RelatedProducts";
import ProductShowcaseWorks from "./_components/ProductShowcaseWorks";
import type { WorkSummary } from "@/lib/types/work";
import SectionContainer from "@/components/SectionContainer";
import DarkCtaSection from "@/components/DarkCtaSection";
import { getPrimaryProductImage } from "@/lib/types/product";

// ISR: ビルド時は生成せず（CIビルドはDB到達不可のため generateStaticParams は空）、
// 初回アクセス時に生成してキャッシュする。商品の作成・更新・削除時は
// API 側の revalidateProductPages() が全詳細ページを即時再生成対象にする。
// Next.js のroute configはimport定数を静的解析できないためリテラルで指定する
// （CACHE_REVALIDATE_SECONDS と同じ値を手で合わせる）。
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const SHOWCASE_WORKS_LIMIT = 8;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// React cache() で generateMetadata とページ本体の二重クエリを1回に集約
const getProduct = cache(async (id: number) => {
  const prisma = getPrismaClient();
  return prisma.product.findUnique({ where: { id } });
});

// 非公開商品はページ本体もメタデータも同条件で弾く（title/description/OG の漏洩防止）。
// getProduct の React cache() 越しに呼ぶため、metadata とページ本体でクエリは1回のまま。
async function getPublishedProduct(rawId: string) {
  const productId = parsePositiveId(rawId);
  if (productId === null) return null;
  const product = await getProduct(productId);
  return product && product.isPublished ? product : null;
}

async function getRelatedProducts(category: string, excludeId: number) {
  const prisma = getPrismaClient();
  const products = await prisma.product.findMany({
    where: { category, isPublished: true, id: { not: excludeId } },
    select: { id: true, name: true, price: true, images: true },
    take: 4,
    orderBy: { createdAt: "desc" },
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: getPrimaryProductImage(product.images),
  }));
}

// この商品を使った公開中の展示例（ギャラリー作品）。
async function getShowcaseWorks(productId: number): Promise<WorkSummary[]> {
  const prisma = getPrismaClient();
  return prisma.work.findMany({
    where: { isPublished: true, products: { some: { productId } } },
    select: { id: true, title: true, category: true, image: true },
    orderBy: { createdAt: "desc" },
    take: SHOWCASE_WORKS_LIMIT,
  });
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublishedProduct(id);
  if (!product) return { title: "商品が見つかりません" };

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description,
      url: `/products/${product.id}`,
      images: [getPrimaryProductImage(product.images) ?? "/og-image.png"],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getPublishedProduct(id);
  if (!product) notFound();

  const [relatedProducts, showcaseWorks] = await Promise.all([
    getRelatedProducts(product.category, product.id),
    getShowcaseWorks(product.id),
  ]);

  // 検索結果に価格・在庫を表示させる Product 構造化データと、
  // パンくずリッチリザルト用の BreadcrumbList をサーバーレンダリングで埋め込む。
  const productJsonLd = buildProductJsonLd(product);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Box sx={{ bgcolor: "#FFFFFF" }}>
        <SectionContainer sx={{ py: { xs: 4, md: 8 } }}>
          <ProductDetail product={product} />
        </SectionContainer>
        {showcaseWorks.length > 0 && <ProductShowcaseWorks works={showcaseWorks} />}
        {relatedProducts.length > 0 && <RelatedProducts products={relatedProducts} />}
        <DarkCtaSection
          heading={<><em>サイズも枚数も、</em><br />ご相談ください。</>}
          body="お手持ちのカードや飾る場所に合わせた特注ディスプレイを、一品から制作します。"
          primaryLabel="特注品のご相談"
          secondaryHref="/products"
          secondaryLabel="商品一覧へ戻る"
        />
      </Box>
    </>
  );
}
