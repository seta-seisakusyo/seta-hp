import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { FONT_DISPLAY } from "@/theme/themeConstants";

interface SplitSectionHeadingProps {
  title: ReactNode;
  description: ReactNode;
}

export default function SplitSectionHeading({ title, description }: SplitSectionHeadingProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr" },
        gap: { xs: 3, md: 10 },
        mb: { xs: 4, md: 8 },
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
      <Box sx={{ fontSize: "16px", color: "secondary.main", lineHeight: 1.7, maxWidth: 540 }}>
        {description}
      </Box>
    </Box>
  );
}
