import { Box } from "@mui/material";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import DarkCtaSection from "@/components/DarkCtaSection";
import PageHero from "@/components/PageHero";
import SectionContainer from "@/components/SectionContainer";
import { FONT_DISPLAY, FONT_ITALIC, PHRASE_WRAP_SX } from "@/theme/themeConstants";

export const metadata: Metadata = {
  title: "製品の特長",
  description:
    "飾Love のアクリルディスプレイは、アクリル一枚とマグネットだけのシンプルな構造。フルプロテクトスリーブやお手持ちのスリーブ、100円ショップのマグネットローダーにも対応し、壁掛け・卓上どちらでも飾れます。",
  alternates: { canonical: "/features" },
};

interface Feature {
  title: ReactNode;
  en: string;
  body: ReactNode;
  /** 補足（小さめの注記） */
  note?: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "アクリル一枚、マグネットで着脱",
    en: "One Panel, Magnetic Mount",
    body: "本体はアクリル板一枚だけ。カードはマグネットで留めるので、付け外しも並べ替えもすぐにできます。",
  },
  {
    title: "フルプロテクトスリーブに対応",
    en: "Full-Protect Sleeve Ready",
    body: "厚みのあるフルプロテクトスリーブに入れたまま飾れます。カードに直接触れずに済み、日焼けや色あせを防ぐ UV 対策もしっかり。",
  },
  {
    title: "お手持ちのスリーブも、そのまま使える",
    en: "Use Your Own Sleeves",
    body: "スリーブを新しく買い足す必要はありません。お手持ちのフルプロテクトスリーブも、付属のツールでマグネットに対応できます。",
    note: "スリーブをお持ちの方向けに「スリーブなし」をご用意している商品もあります。詳しくは各商品ページの「対応スリーブ」をご覧ください。",
  },
  {
    title: "100円ショップのマグネットローダーも飾れる",
    en: "Works with Magnetic Loaders",
    body: "フルプロテクトスリーブだけでなく、100円ショップで手に入るマグネットローダーに入れたカードもディスプレイできます。",
  },
  {
    title: "壁掛けにも、卓上にも",
    en: "Wall or Desktop",
    body: "壁に掛けても、スタンドで机に置いても。飾る場所に合わせて使い分けられます。",
    note: "付属品は商品によって異なります。各商品ページでご確認ください。",
  },
  {
    title: "オーダーメイドもお手頃に",
    en: "Made to Order",
    body: "枚数やサイズ、レイアウトのご希望に合わせて一品から製作します。オーダーメイドも、手の届く価格でお作りします。",
  },
  {
    title: "シンプルだから、お求めやすい",
    en: "Simple, So Affordable",
    body: "構造をシンプルにした分、価格を抑えました。同じようなカードディスプレイと比べても、ぐっとお求めやすい価格です。",
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
        gap: { xs: 1.5, md: 6 },
        py: { xs: 3.5, md: 5 },
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box>
        <Box
          sx={{
            fontFamily: FONT_ITALIC,
            fontStyle: "italic",
            color: "primary.main",
            fontSize: { xs: "28px", md: "40px" },
            lineHeight: 1,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </Box>
        <Box
          sx={{
            mt: 1,
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {feature.en}
        </Box>
      </Box>
      <Box sx={{ maxWidth: 720 }}>
        <Box
          component="h2"
          sx={{
            fontFamily: FONT_DISPLAY,
            fontSize: { xs: "22px", md: "28px" },
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            color: "text.primary",
            mt: 0,
            mb: 1.5,
            ...PHRASE_WRAP_SX,
          }}
        >
          {feature.title}
        </Box>
        <Box sx={{ fontSize: "15.5px", lineHeight: 1.9, color: "secondary.main" }}>{feature.body}</Box>
        {feature.note && (
          <Box sx={{ mt: 1.5, fontSize: "13px", lineHeight: 1.8, color: "text.secondary" }}>
            ※ {feature.note}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function FeaturesPage() {
  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      <PageHero
        eyebrow="Features · 製品の特長"
        heading={
          <>
            シンプルだから、
            <br />
            <em>飾りやすい。</em>
          </>
        }
        subtitle="— Simple by design."
        description="アクリル一枚とマグネットだけの、シンプルな構造。お手持ちのスリーブやローダーも活かせて、飾る場所も、価格も、選びやすくしました。"
      />

      <Box component="section" sx={{ pb: { xs: 6, md: 9 } }}>
        <SectionContainer>
          <Box
            component="ol"
            sx={{ listStyle: "none", m: 0, p: 0, borderBottom: "1px solid", borderColor: "divider" }}
          >
            {FEATURES.map((feature, index) => (
              <FeatureRow key={feature.en} feature={feature} index={index} />
            ))}
          </Box>
        </SectionContainer>
      </Box>

      <DarkCtaSection
        heading={
          <>
            <em>サイズも枚数も、</em>
            <br />
            ご相談ください。
          </>
        }
        body="お手持ちのカードや飾る場所に合わせたディスプレイを、一品から製作します。"
        primaryLabel="オーダーメイドのご相談"
        secondaryHref="/products"
        secondaryLabel="カタログを見る"
      />
    </Box>
  );
}
