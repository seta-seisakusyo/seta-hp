import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import SectionHeader from "@/components/SectionHeader";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

const VALUES = [
  {
    no: "i.",
    title: "カード愛",
    titleEn: "Collector First",
    body: "私自身がコレクター。だからこそ「こんなディスプレイが欲しい」というコレクター心理がわかります。飾りたいカードに合わせた設計、傷つけない構造。すべて自分が欲しかったものです。",
  },
  {
    no: "ii.",
    title: "丁寧なものづくり",
    titleEn: "Craftsmanship",
    body: "レーザーで0.1mmの精度で切削。エッジは一つずつ手で面取り。検品も自分が納得するまで、出荷しません。",
  },
  {
    no: "iii.",
    title: "対話して作る",
    titleEn: "Made Together",
    body: "「こんなディスプレイが欲しい」という具体的なご相談を受けて、特注品もお作りします。個人工房なので、量はこなせませんが、対話の時間は惜しみません。",
  },
];

const AboutValues = () => {
  return (
    <Box component="section" sx={{ bgcolor: "background.alt", py: { xs: 10, md: 15 } }}>
      <SectionContainer>
        <SectionHeader
          number="03"
          title="Values"
          titleJa="大切にしていること"
          marginBottom={8}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: { xs: 4, md: 5 },
          }}
        >
          {VALUES.map((v) => (
            <Box key={v.no}>
              <Box
                sx={{
                  fontFamily: FONT_ITALIC,
                  fontStyle: "italic",
                  fontSize: "14px",
                  color: "primary.main",
                  letterSpacing: "0.1em",
                  mb: 3,
                }}
              >
                {v.no}
              </Box>
              <Box
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "26px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                  mb: 0.75,
                }}
              >
                {v.title}
              </Box>
              <Box
                sx={{
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  fontWeight: 500,
                  mb: 2,
                }}
              >
                {v.titleEn}
              </Box>
              <Box sx={{ fontSize: "14px", color: "secondary.main", lineHeight: 1.85 }}>
                {v.body}
              </Box>
            </Box>
          ))}
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default AboutValues;
