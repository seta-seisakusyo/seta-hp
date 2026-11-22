import { Box } from "@mui/material";
import type { Metadata } from "next";
import HeroSection from "./_home/HeroSection";
import CatalogueSection from "./_home/CatalogueSection";
import { getHomeProductData } from "./_home/getHomeProductData";
import FeaturesSection from "./_home/FeaturesSection";
import CTASection from "./_home/CTASection";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION } from "@/lib/site-config";

// リクエスト毎にレンダリングする（ヒーロー画像を出していた頃はリクエスト毎に抽選していた）。
// 表示データ自体は unstable_cache（products タグ）でキャッシュ済みのため、DBアクセスは発生しない。
// ※ CIビルド時はDBに到達できないため、静的生成（ISR）にはしない。
export const dynamic = "force-dynamic";

// 題名は template（「… | 飾Love」）を付けずにそのまま使う。説明文はサイト共通の SITE_DESCRIPTION
// （OG・Organization の構造化データと同じ文）に揃える。
export const metadata: Metadata = buildPageMetadata({
  title: { absolute: SITE_DEFAULT_TITLE },
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const { catalogueProducts } = await getHomeProductData();

  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      {/* ヒーロー右側の画像は #329 で非表示。戻すときは heroImages から抽選して heroImage に渡す */}
      <HeroSection />
      <CatalogueSection products={catalogueProducts} />
      <FeaturesSection />
      {/* サイズ診断（QuizTeaserSection）は #326 で非表示。診断機能の公開時に戻す */}
      <CTASection />
    </Box>
  );
}
