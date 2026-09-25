import { Box } from "@mui/material";
import Link from "next/link";
import { COLOR_DARK_ACCENT } from "@/theme/themeConstants";
import type { ReactNode } from "react";

type PillLinkTone = "dark" | "light" | "outline";

interface PillLinkProps {
  href: string;
  children: ReactNode;
  tone?: PillLinkTone;
  showArrow?: boolean;
  compact?: boolean;
}

const TONE_STYLES = {
  dark: {
    bgcolor: "background.dark",
    color: "#FFFFFF",
    fontWeight: 600,
    transition: "background-color 0.2s, transform 0.2s",
    "&:hover": { bgcolor: "primary.main", transform: "translateY(-1px)" },
  },
  light: {
    bgcolor: "#FFFFFF",
    color: "text.primary",
    fontWeight: 600,
    transition: "background-color 0.2s, transform 0.2s",
    "&:hover": { bgcolor: COLOR_DARK_ACCENT, transform: "translateY(-1px)" },
  },
  outline: {
    color: "#FFFFFF",
    fontWeight: 500,
    border: "1px solid rgba(255,255,255,0.25)",
    transition: "border-color 0.2s",
    "&:hover": { borderColor: "#FFFFFF" },
  },
} as const;

/** サイト内で共通使用する丸型CTAリンク。 */
export default function PillLink({
  href,
  children,
  tone = "dark",
  showArrow = false,
  compact = false,
}: PillLinkProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "inline-block" }}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1.25,
          px: compact ? 3 : 3.5,
          py: compact ? 1.5 : 2,
          borderRadius: "999px",
          fontSize: "14px",
          cursor: "pointer",
          ...TONE_STYLES[tone],
        }}
      >
        {children}
        {showArrow && <span>→</span>}
      </Box>
    </Link>
  );
}
