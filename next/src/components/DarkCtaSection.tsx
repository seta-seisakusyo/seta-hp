import { Box } from "@mui/material";
import PillLink from "@/components/PillLink";
import type { ReactNode } from "react";
import SectionContainer from "@/components/SectionContainer";
import { COLOR_DARK_ACCENT, FONT_DISPLAY } from "@/theme/themeConstants";

interface DarkCtaSectionProps {
  /** 見出し（h2）。<em> は銅色アクセントになる */
  heading: ReactNode;
  /** 本文 */
  body: ReactNode;
  /** 主ボタン（白背景）のラベル。末尾に矢印が付く */
  primaryLabel: ReactNode;
  /** 副ボタン（枠線）のラベル */
  secondaryLabel: ReactNode;
  /** 副ボタンのリンク先 */
  secondaryHref: string;
}

/**
 * ダークな2カラム CTA セクション。
 * GalleryCta / ProductsBespokeCta が同一レイアウトだったため共通化（#195）。
 * インタラクションは CSS hover のみのためサーバーコンポーネント。
 */
export default function DarkCtaSection({
  heading,
  body,
  primaryLabel,
  secondaryLabel,
  secondaryHref,
}: DarkCtaSectionProps) {
  return (
    <Box component="section" sx={{ bgcolor: "background.dark", color: "#FFFFFF", py: { xs: 6, md: 9 } }}>
      <SectionContainer>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: { xs: 4, md: 8 }, alignItems: "center" }}>
          <Box
            component="h2"
            sx={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(36px, 4.5vw, 64px)",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.1,
              m: 0,
              "& em": { fontStyle: "normal", color: COLOR_DARK_ACCENT },
            }}
          >
            {heading}
          </Box>

          <Box>
            <Box
              sx={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "15px",
                lineHeight: 1.9,
                mb: 3.5,
              }}
            >
              {body}
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <PillLink href="/contact" tone="light" showArrow>{primaryLabel}</PillLink>
              <PillLink href={secondaryHref} tone="outline">{secondaryLabel}</PillLink>
            </Box>
          </Box>
        </Box>
      </SectionContainer>
    </Box>
  );
}
