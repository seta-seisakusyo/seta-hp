import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import SectionHeader from "@/components/SectionHeader";
import { FONT_DISPLAY } from "@/theme/themeConstants";

const FEATURES = [
  { en: "Studio-Built", ja: "設計・製作・梱包まで個人工房で一貫" },
  { en: "Laser Cut", ja: "0.1mm 精度のレーザー加工" },
];

const AboutFeatures = () => {
  return (
    <Box component="section" sx={{ py: { xs: 10, md: 15 } }}>
      <SectionContainer>
        <SectionHeader
          number="04"
          title="Features"
          titleJa="飾Love の特徴"
          marginBottom={6}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr" }, gap: { xs: 0, md: 10 } }}>
          <Box
            sx={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(28px, 3.4vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "text.primary",
              lineHeight: 1.15,
              mb: { xs: 5, md: 0 },
            }}
          >
            {FEATURES.length}つの<br />
            <Box component="span" sx={{ color: "primary.main" }}>こだわり。</Box>
          </Box>

          <Box>
            {FEATURES.map((f, i) => (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" },
                  gap: { xs: 0.5, sm: 4 },
                  py: 3,
                  borderTop: "1px solid",
                  borderTopColor: "divider",
                  ...(i === FEATURES.length - 1 && { borderBottom: "1px solid", borderBottomColor: "divider" }),
                }}
              >
                <Box
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: "16px",
                    letterSpacing: "-0.01em",
                    color: "text.primary",
                  }}
                >
                  {f.en}
                </Box>
                <Box sx={{ fontSize: "14.5px", color: "secondary.main", lineHeight: 1.7 }}>
                  {f.ja}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default AboutFeatures;
