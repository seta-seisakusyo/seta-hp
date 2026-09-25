import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import { FONT_DISPLAY } from "@/theme/themeConstants";
import PillLink from "@/components/PillLink";

const QuizTeaserSection = () => {
  return (
    <Box component="section" sx={{ bgcolor: "#FFFFFF", py: { xs: 6, md: 9 } }}>
      <SectionContainer>
        <Box
          sx={{
            background: "linear-gradient(135deg, #FEF3E2 0%, #FFFFFF 100%)",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px",
            p: { xs: 3, md: 6 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: { xs: 3.5, md: 5 },
            alignItems: "center",
          }}
        >
          <Box>
            <Box
              sx={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "primary.main",
                mb: 2,
              }}
            >
              Coming Soon · 近日公開
            </Box>
            <Box
              component="h2"
              sx={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(32px, 3.4vw, 48px)",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
                color: "text.primary",
                m: 0,
                "& em": { fontStyle: "normal", color: "primary.main" },
              }}
            >
              サイズに、
              <br />
              <em>迷ったら。</em>
            </Box>
          </Box>

          <Box>
            <Box sx={{ color: "secondary.main", fontSize: "15px", lineHeight: 1.7, mb: 3.5 }}>
              推し選手・カードの状態・置き場所・枚数。
              4つの質問に答えていただければ、最適なモデルを30秒でご提案します。
            </Box>
            <PillLink href="/contact" showArrow>サイズ診断をはじめる</PillLink>
          </Box>
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default QuizTeaserSection;
