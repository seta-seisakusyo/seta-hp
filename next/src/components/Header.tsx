"use client";

import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Button, IconButton, Toolbar } from "@mui/material";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SectionContainer from "@/components/SectionContainer";
import XIcon from "@/components/XIcon";
import { NAV_LINKS } from "@/lib/navigation";
import { X_PROFILE_URL } from "@/lib/site-config";
import { FONT_DISPLAY, HEADER_HEIGHTS } from "@/theme/themeConstants";

// next-auth のクライアントJSは遅延チャンクに分離（初期バンドル削減 #245）
// 読込中のプレースホルダは出さない。一般訪問者には最終的に何も表示されないため、
// 人型アイコンを挟むと「一瞬見えて消える」ちらつきになる（#258）。
const UserAuthMenu = dynamic(() => import("@/components/UserAuthMenu"), {
  ssr: false,
});

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
          color: "text.primary",
        }}
      >
        <SectionContainer>
          <Toolbar
            disableGutters
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: { xs: HEADER_HEIGHTS.mobile, md: HEADER_HEIGHTS.desktop },
            }}
          >
            {/* Brand */}
            <Link
              href="/"
              style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", minHeight: 44 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontFamily: FONT_DISPLAY,
                  fontSize: { xs: "16px", md: "19px" },
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                }}
              >
                <Box
                  component="img"
                  src="/kaza-love_logo.png"
                  alt=""
                  sx={{
                    height: { xs: 32, md: 38 },
                    width: "auto",
                    display: "inline-block",
                    flexShrink: 0,
                    verticalAlign: "middle",
                  }}
                />
                <Box component="span" sx={{ lineHeight: 1 }}>かざらぶ</Box>
              </Box>
            </Link>

            {/* Nav（CSSブレークポイントで出し分け。useMediaQuery による
                ハイドレーション後のちらつきを避ける #245） */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 4 } }}>
              {/* Desktop: ナビリンク */}
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ textDecoration: "none" }}
                  >
                    <Box
                      sx={{
                        color: "text.primary",
                        fontSize: "14px",
                        fontWeight: 500,
                        transition: "color 0.2s",
                        cursor: "pointer",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      {item.label}
                    </Box>
                  </Link>
                ))}
              </Box>

              {/* X (Twitter)。スマホはメニュー内に置き、ヘッダーはメニューボタンだけにする */}
              <Box
                component="a"
                href={X_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.primary",
                  transition: "color 0.2s",
                  "&:hover": { color: "primary.main" },
                }}
                aria-label="X (Twitter)"
              >
                <XIcon />
              </Box>

              {/* Desktop: 購入CTA */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Link href="/products" style={{ textDecoration: "none" }}>
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: "background.dark",
                      color: "#FFFFFF",
                      px: 2.5,
                      py: 1.1,
                      fontSize: "13px",
                      fontWeight: 600,
                      "&:hover": { bgcolor: "primary.main" },
                    }}
                  >
                    購入する →
                  </Button>
                </Link>
              </Box>

              {/* 認証ボタン（遅延読み込み） */}
              <UserAuthMenu />

              {/* Mobile: メニュー（全ページへの導線と購入CTAを1画面にまとめる） */}
              <IconButton
                edge="end"
                aria-label="メニューを開く"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                sx={{ display: { xs: "inline-flex", md: "none" }, width: 48, height: 48 }}
              >
                <MenuIcon sx={{ color: "text.primary" }} />
              </IconButton>
              <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
            </Box>
          </Toolbar>
        </SectionContainer>
      </AppBar>
      <Box sx={{ height: { xs: HEADER_HEIGHTS.mobile, md: HEADER_HEIGHTS.desktop } }} />
    </>
  );
}
