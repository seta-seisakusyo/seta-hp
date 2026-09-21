import { Box, Typography } from "@mui/material";
import Link from "next/link";
import SectionContainer from "@/components/SectionContainer";
import XIcon from "@/components/XIcon";
import { X_PROFILE_URL } from "@/lib/site-config";
import { PRODUCT_CATEGORIES } from "@/lib/constants/categories";
import { COLOR_DARK_ACCENT, FONT_DISPLAY } from "@/theme/themeConstants";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    // 個別の商品名は置かない。フッターはルートレイアウトにあり静的ページにも焼き込まれるため、
    // 商品名を直書きすると非公開にしても全ページに残り続ける。DBから引くのも不可
    // （CIビルドはDBへ到達できず、静的ページに空のリンク欄が固定される）。
    // 商品の増減に左右されないカテゴリ定数から組み立てる。
    title: "Catalogue / 品目",
    links: [
      { label: "商品一覧", href: "/products" },
      ...PRODUCT_CATEGORIES.map((category) => ({
        label: category.label,
        href: `/products?category=${category.value}`,
      })),
      { label: "特注品のご相談", href: "/contact" },
    ],
  },
  {
    title: "Studio / 工房",
    links: [
      { label: "工房について", href: "/about" },
      { label: "作り方", href: "/about" },
      { label: "ギャラリー", href: "/gallery" },
      { label: "お問い合わせ", href: "/contact" },
    ],
  },
  {
    title: "Policies / 規約",
    links: [
      { label: "配送について", href: "/shipping" },
      { label: "特定商取引法", href: "/legal" },
      { label: "プライバシー", href: "/privacy-policy" },
      { label: "会社情報", href: "/company" },
    ],
  },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "background.dark",
        color: "rgba(255,255,255,0.55)",
        pt: { xs: 8, md: 10 },
        pb: 5,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr" },
            gap: { xs: 5, md: 7.5 },
            pb: 7,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Brand */}
          <Box>
            <Box
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: "24px",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                mb: 1.75,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Box
                component="img"
                src="/kaza-love_logo.png"
                alt=""
                sx={{
                  height: 48,
                  width: "auto",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              かざらぶ
            </Box>
            <Typography
              sx={{
                fontSize: "13px",
                lineHeight: 1.8,
                maxWidth: 320,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              飾Love(かざらぶ)は、小さな個人工房から、
              MLBカード・トレカコレクターのためのハンドメイドアクリルディスプレイをお届けします。
              レーザー加工で、ひとつずつ丁寧に。
            </Typography>
            <Box
              component="a"
              href={X_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mt: 2.5,
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.4)",
                  color: "#FFFFFF",
                },
              }}
              aria-label="X (Twitter)"
            >
              <XIcon />
            </Box>
          </Box>

          {/* Columns */}
          {COLUMNS.map((col) => (
            <Box key={col.title}>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: COLOR_DARK_ACCENT,
                  mb: 2.5,
                }}
              >
                {col.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                {col.links.map((link) => (
                  <Box component="li" key={link.label} sx={{ mb: 1.25 }}>
                    <Link
                      href={link.href}
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        textDecoration: "none",
                        fontSize: "13px",
                      }}
                    >
                      {link.label}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 4,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            fontSize: "12px",
            letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <span>© {new Date().getFullYear()} 飾Love</span>
          <span>Made in Japan</span>
        </Box>
      </SectionContainer>
    </Box>
  );
}
