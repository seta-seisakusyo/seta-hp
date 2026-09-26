import { Box } from "@mui/material";
import type { Metadata } from "next";
import HeroSection from "./_home/HeroSection";
import CatalogueSection from "./_home/CatalogueSection";
import { getHomeProductData } from "./_home/getHomeProductData";
import FeaturesSection from "./_home/FeaturesSection";
import CTASection from "./_home/CTASection";

// ヒーロー画像の抽選をリクエスト毎に行うため動的レンダリングとする。
// 表示データ自体は unstable_cache（products タグ）でキャッシュ済みのため、DBアクセスは発生しない。
// ※ CIビルド時はDBに到達できないため、静的生成（ISR）にはしない。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "飾Love | MLBカード・トレカを美しく飾る",
  description:
    "MLBカード・トレカを美しく飾るための、小さな個人工房から。レーザー加工で一つずつ手作りのアクリルディスプレイ。",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const { catalogueProducts, heroImages } = await getHomeProductData();
  const heroImage =
    heroImages.length > 0
      ? heroImages[Math.floor(Math.random() * heroImages.length)]
      : null;

  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      <HeroSection heroImage={heroImage} />
      <CatalogueSection products={catalogueProducts} />
      <FeaturesSection />
      {/* サイズ診断（QuizTeaserSection）は #326 で非表示。診断機能の公開時に戻す */}
      <CTASection />
    </Box>
  );
}
