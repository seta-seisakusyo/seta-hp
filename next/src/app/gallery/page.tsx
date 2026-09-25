import { Box } from "@mui/material";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getPrismaClient } from "@/lib/db";
import { CACHE_REVALIDATE_SECONDS, CACHE_TAGS } from "@/lib/cache-tags";
import { parsePositiveId } from "@/lib/parse-id";
import type { WorkGridItem } from "@/lib/types/work";
import GalleryGrid from "./_components/GalleryGrid";
import PageHero from "@/components/PageHero";
import DarkCtaSection from "@/components/DarkCtaSection";

// CIビルド時はDBに到達できないため静的生成はせず、
// リクエスト毎レンダリング + unstable_cache（works タグ）でDBアクセスを抑える。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ギャラリー",
  description:
    "飾Love の制作事例ギャラリー。MLB・野球カードのアクリル壁面ディスプレイなど、実際の設置イメージをご覧いただけます。",
  alternates: {
    canonical: "/gallery",
  },
};

// 公開制作事例の全件取得。使用商品は公開中のものだけを含める。
// 制作事例・商品の書き込み時に works タグで無効化される。
const getWorks = unstable_cache(
  async (): Promise<WorkGridItem[]> => {
    const prisma = getPrismaClient();
    const works = await prisma.work.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        category: true,
        image: true,
        products: {
          where: { product: { isPublished: true } },
          select: { product: { select: { id: true, name: true } } },
          orderBy: { productId: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return works.map(({ products, ...work }) => ({
      ...work,
      products: products.map((link) => link.product),
    }));
  },
  ["published-works-with-products"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAGS.works] }
);

interface GalleryPageProps {
  searchParams: Promise<{ work?: string | string[] }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const works = await getWorks();
  // 商品詳細の「展示例」から /gallery?work={id} で来たときに、その作品を開いた状態で表示する。
  const { work } = await searchParams;
  const initialWorkId = typeof work === "string" ? parsePositiveId(work) : null;

  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      <PageHero
        eyebrow="Gallery · 制作事例"
        heading={
          <>
            これまでの<br />
            <em>仕事。</em>
          </>
        }
        subtitle="— Selected works from the workshop."
        stats={[
          { value: works.length, label: "Works on display" },
          { value: "Solo", label: "One maker" },
        ]}
      />
      <GalleryGrid works={works} initialWorkId={initialWorkId} />
      <DarkCtaSection
        heading={
          <>
            こんなのが<br />
            <em>作れますか?</em>
          </>
        }
        body="特注品・大型品・サイズや形状の個別調整など、お気軽にご相談ください。一品から制作します。"
        primaryLabel="お問い合わせ"
        secondaryHref="/products"
        secondaryLabel="カタログを見る"
      />
    </Box>
  );
}
