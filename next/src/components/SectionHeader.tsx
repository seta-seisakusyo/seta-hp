import { Box } from "@mui/material";
import { FONT_ITALIC } from "@/theme/themeConstants";

interface SectionHeaderProps {
  /** 見出し番号（例: "01"）。省略時はダッシュのみ */
  number?: string;
  title: string;
  titleJa: string;
  marginBottom?: number;
}

/** 「— 01 English ／ 日本語」形式の罫線付きセクション見出し。 */
export default function SectionHeader({
  number,
  title,
  titleJa,
  marginBottom = 8,
}: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 3,
        borderTop: "1px solid",
        borderTopColor: "text.primary",
        pt: 3.5,
        mb: { xs: 3, md: marginBottom },
        fontFamily: FONT_ITALIC,
        fontStyle: "italic",
        fontSize: "16px",
        letterSpacing: "0.05em",
      }}
    >
      <Box sx={{ color: "primary.main" }}>{number ? `— ${number}` : "—"}</Box>
      <Box sx={{ color: "text.primary" }}>{title}</Box>
      <Box sx={{ color: "text.secondary", fontSize: "14px" }}>／　{titleJa}</Box>
    </Box>
  );
}
