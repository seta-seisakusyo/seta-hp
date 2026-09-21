import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import { COLOR_DARK_ACCENT, FONT_DISPLAY } from "@/theme/themeConstants";
import PillLink from "@/components/PillLink";

const CTASection = () => {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: "background.dark",
        color: "#FFFFFF",
        py: { xs: 10, md: 15 },
        textAlign: "center",
      }}
    >
      <SectionContainer>
        <Box
          component="h2"
          sx={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(48px, 6vw, 96px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            mt: 0,
            mb: 3,
            "& em": { fontStyle: "normal", color: COLOR_DARK_ACCENT },
          }}
        >
          あなたのカードに、
          <br />
          <em>居場所を。</em>
        </Box>
        <Box
          sx={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.7)",
            maxWidth: 480,
            mx: "auto",
            mb: 5,
            lineHeight: 1.7,
          }}
        >
          一つずつ手作り。壁に、机に、あなたのそばに。
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1.75,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <PillLink href="/products" tone="light" showArrow>BASEで購入する</PillLink>
          <PillLink href="/contact" tone="outline">特注品のご相談</PillLink>
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default CTASection;
