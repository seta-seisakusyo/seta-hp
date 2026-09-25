import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { FONT_DISPLAY } from "@/theme/themeConstants";

interface SplitSectionHeadingProps {
  title: ReactNode;
  /** 見出し右（スマホは下）の説明文。省略時は見出しのみ */
  description?: ReactNode;
}

export default function SplitSectionHeading({ title, description }: SplitSectionHeadingProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: description ? "1fr 1.4fr" : "1fr" },
        gap: { xs: 3, md: 10 },
        mb: { xs: 4, md: 5 },
        alignItems: "end",
      }}
    >
      <Box
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: "clamp(40px, 4.6vw, 64px)",
          lineHeight: 1,
          letterSpacing: "-0.035em",
          color: "text.primary",
          "& em": { fontStyle: "normal", color: "primary.main" },
        }}
      >
        {title}
      </Box>
      {description && (
        <Box sx={{ fontSize: "16px", color: "secondary.main", lineHeight: 1.7, maxWidth: 540 }}>
          {description}
        </Box>
      )}
    </Box>
  );
}
