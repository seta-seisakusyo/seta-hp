import { Box } from "@mui/material";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";
import SectionContainer from "@/components/SectionContainer";

interface Props {
  eyebrow?: string;
  title: string;
  description: string;
}

/**
 * 一覧が空のときの「Coming Soon」ブロック。
 * ProductsGrid / GalleryGrid で重複していた空状態マークアップを共通化（#245）。
 */
export default function EmptyState({ eyebrow = "Coming Soon", title, description }: Props) {
  return (
    <Box component="section" sx={{ py: { xs: 5, md: 8 }, bgcolor: "background.alt" }}>
      <SectionContainer>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "6px",
            p: { xs: 5, md: 10 },
            textAlign: "center",
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              fontFamily: FONT_ITALIC,
              fontStyle: "italic",
              color: "primary.main",
              fontSize: "14px",
              letterSpacing: "0.1em",
              mb: 1,
            }}
          >
            {eyebrow}
          </Box>
          <Box
            sx={{
              fontFamily: FONT_DISPLAY,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "text.primary",
              mb: 1.5,
            }}
          >
            {title}
          </Box>
          <Box sx={{ fontSize: "14px", color: "text.secondary" }}>{description}</Box>
        </Box>
      </SectionContainer>
    </Box>
  );
}
