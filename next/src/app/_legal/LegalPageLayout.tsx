import { Box, Container } from "@mui/material";
import PillLink from "@/components/PillLink";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

interface Props {
  titleJa: string;
  titleEn: string;
  eyebrow?: string;
  children: React.ReactNode;
}

/**
 * 規約系ページ用の共通レイアウト
 * /shipping, /legal, /privacy-policy, /company で共有
 * サーバーコンポーネント（フォントは themeConstants から直接参照）
 */
const LegalPageLayout: React.FC<Props> = ({
  titleJa,
  titleEn,
  eyebrow,
  children,
}) => {
  return (
    <Box sx={{ bgcolor: "#FFFFFF" }}>
      {/* Hero (compact) */}
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 6 },
          borderBottom: "1px solid",
          borderColor: "divider",
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(180,83,9,0.03), transparent 50%), #FFFFFF",
        }}
      >
        <Container maxWidth="md" sx={{ maxWidth: "880px !important" }}>
          {eyebrow && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.5,
                mb: 2.5,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "primary.main",
              }}
            >
              <Box sx={{ width: 24, height: "1px", bgcolor: "primary.main" }} />
              {eyebrow}
            </Box>
          )}
          <Box
            component="h1"
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(32px, 4vw, 56px)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "text.primary",
              mt: 0,
              mb: 1.5,
            }}
          >
            {titleJa}
          </Box>
          <Box
            sx={{
              fontFamily: FONT_ITALIC,
              fontStyle: "italic",
              fontSize: "16px",
              color: "text.secondary",
              letterSpacing: "0.02em",
            }}
          >
            — {titleEn}
          </Box>
        </Container>
      </Box>

      {/* Body */}
      <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md" sx={{ maxWidth: "880px !important" }}>
          <Box
            sx={{
              maxWidth: 720,
              "& h2": {
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "20px",
                letterSpacing: "-0.015em",
                color: "text.primary",
                mt: 5,
                mb: 1.5,
                pl: 2,
                borderLeft: "3px solid",
                borderColor: "primary.main",
                lineHeight: 1.4,
              },
              "& h3": {
                fontFamily: FONT_DISPLAY,
                fontWeight: 600,
                fontSize: "15px",
                letterSpacing: "-0.005em",
                color: "text.primary",
                mt: 3,
                mb: 1,
              },
              "& p": {
                fontSize: "14.5px",
                color: "secondary.main",
                lineHeight: 1.9,
                mb: 2,
              },
              "& ul, & ol": {
                pl: 3,
                mb: 2,
              },
              "& li": {
                fontSize: "14.5px",
                color: "secondary.main",
                lineHeight: 1.9,
                mb: 0.75,
              },
              "& a": {
                color: "primary.main",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              },
              "& strong": { color: "text.primary", fontWeight: 600 },
            }}
          >
            {children}
          </Box>
        </Container>
      </Box>

      {/* CTA */}
      <Box
          component="section"
          sx={{ bgcolor: "background.alt", py: { xs: 5, md: 7 } }}
        >
          <Container maxWidth="md" sx={{ maxWidth: "880px !important" }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                gap: 3,
                alignItems: "center",
              }}
            >
              <Box>
                <Box
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "text.primary",
                    mb: 0.75,
                  }}
                >
                  ご不明な点はお気軽に。
                </Box>
                <Box sx={{ fontSize: "13.5px", color: "text.secondary" }}>
                  記載内容について質問・確認したいことがあれば、お問い合わせください。
                </Box>
              </Box>
              <PillLink href="/contact" compact showArrow>お問い合わせ</PillLink>
            </Box>
          </Container>
      </Box>
    </Box>
  );
};

export default LegalPageLayout;
