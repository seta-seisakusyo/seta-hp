import { Box } from "@mui/material";
import type { ReactNode } from "react";
import SectionContainer from "@/components/SectionContainer";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

interface HeroStat {
  value: ReactNode;
  label: ReactNode;
}

interface PageHeroProps {
  /** アイブロウ（小見出し）。先頭に銅色の横線が付く */
  eyebrow: ReactNode;
  /** 見出し（h1）。<em> は銅色アクセントになる */
  heading: ReactNode;
  /** 斜体サブタイトル（"— ..." を含めて渡す） */
  subtitle: ReactNode;
  /** 本文（任意） */
  description?: ReactNode;
  /** Contact用の少しコンパクトな表示 */
  variant?: "default" | "contact";
  /** 下部の統計行（任意） */
  stats?: HeroStat[];
  /** 統計行を折り返す（項目が多いページ用） */
  statsWrap?: boolean;
}

/**
 * ライトテーマのページヒーロー（アイブロウ＋大見出し＋斜体サブ＋任意の統計行）。
 * GalleryHero / ProductsHero が同一の外殻だったため共通化（#195）。
 * インタラクションなしのサーバーコンポーネント。
 */
export default function PageHero({
  eyebrow,
  heading,
  subtitle,
  description,
  variant = "default",
  stats,
  statsWrap,
}: PageHeroProps) {
  const isContact = variant === "contact";

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 11 },
        background:
          isContact
            ? "radial-gradient(ellipse at 20% 30%, rgba(180,83,9,0.04), transparent 50%), #FFFFFF"
            : "radial-gradient(ellipse at 80% 30%, rgba(180,83,9,0.05), transparent 50%), #FFFFFF",
      }}
    >
      <SectionContainer>
        <Box sx={{ maxWidth: isContact ? 720 : 800 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1.5,
              mb: { xs: 2, md: 3 },
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "primary.main",
            }}
          >
            <Box sx={{ width: 28, height: "1px", bgcolor: "primary.main" }} />
            {eyebrow}
          </Box>

          <Box
            component="h1"
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: isContact ? "clamp(40px, 5vw, 72px)" : "clamp(40px, 5.5vw, 84px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "text.primary",
              mt: 0,
              mb: isContact ? 2 : 3,
              "& em": { fontStyle: "normal", color: "primary.main" },
            }}
          >
            {heading}
          </Box>

          <Box
            sx={{
              fontFamily: FONT_ITALIC,
              fontStyle: "italic",
              fontSize: { xs: "17px", md: "20px" },
              color: "text.secondary",
              mb: { xs: description ? 2.5 : 0, md: 4 },
              letterSpacing: "0.02em",
            }}
          >
            {subtitle}
          </Box>

          {description && (
            <Box sx={{ fontSize: "16px", color: "secondary.main", lineHeight: 1.8, maxWidth: 560 }}>
              {description}
            </Box>
          )}

          {/* 統計行は装飾的な情報なので、スマホでは本題（一覧）を上に詰めるため出さない */}
          {stats && stats.length > 0 && (
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                gap: 5,
                pt: 3,
                borderTop: "1px solid",
                borderColor: "divider",
                ...(statsWrap ? { flexWrap: "wrap" } : {}),
              }}
            >
              {stats.map((stat, i) => (
                <Box key={i}>
                  <Box
                    sx={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: "26px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "text.primary",
                      mb: 0.5,
                    }}
                  >
                    {stat.value}
                  </Box>
                  <Box
                    sx={{
                      fontSize: "12px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "text.secondary",
                    }}
                  >
                    {stat.label}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </SectionContainer>
    </Box>
  );
}
