import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import { FONT_DISPLAY } from "@/theme/themeConstants";
import SplitSectionHeading from "./SplitSectionHeading";

const FEATURES = [
  {
    num: "01",
    title: "オーダーメイド対応",
    titleEn: "Made to Order",
    body: "飾りたいカードに合わせて設計。オーダーメイドもカタログ品と同じ価格帯でお作りします。",
  },
  {
    num: "02",
    title: "マグネット着脱",
    titleEn: "Magnetic Mount",
    body: "着脱はマグネット式。並べ替えも入れ替えも手早く行えます。",
  },
  {
    num: "03",
    title: "カード以外も飾れる",
    titleEn: "Beyond Cards",
    body: "付属ツールでカード以外にも対応。アクリルキーホルダーや缶バッジも一緒に飾れます。",
  },
  {
    num: "04",
    title: "壁掛け・卓上 両対応",
    titleEn: "Wall or Desktop",
    body: "サイズによっては壁掛け金具と卓上スタンドが付属。いつでも置き場所を変えられます。",
  },
];

const FeaturesSection = () => {
  return (
    <Box component="section" sx={{ bgcolor: "background.alt", py: { xs: 6, md: 9 } }}>
      <SectionContainer>
        <SplitSectionHeading
          title={<>長く、<em>共に。</em></>}
          description={
            <>
              飾るカードの方が長持ちするくらい、ディスプレイ側もしっかり作る。
              <br />
              手を抜かないことが、飾Love のスタンダードです。
            </>
          }
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: "1px",
            bgcolor: "divider",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          {FEATURES.map((f) => (
            <Box key={f.num} sx={{ bgcolor: "#FFFFFF", p: { xs: 3, md: 5 } }}>
              <Box
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "primary.main",
                  mb: 3,
                  letterSpacing: "0.1em",
                }}
              >
                {f.num}
              </Box>
              <Box
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "19px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  mb: 1.25,
                  color: "text.primary",
                }}
              >
                {f.title}
              </Box>
              <Box
                sx={{
                  fontSize: "12px",
                  color: "text.secondary",
                  mb: 1.75,
                }}
              >
                {f.titleEn}
              </Box>
              <Box sx={{ fontSize: "13.5px", color: "secondary.main", lineHeight: 1.7 }}>
                {f.body}
              </Box>
            </Box>
          ))}
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default FeaturesSection;
