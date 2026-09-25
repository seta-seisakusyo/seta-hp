"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Drawer, IconButton } from "@mui/material";
import Link from "next/link";
import XIcon from "@/components/XIcon";
import { NAV_LINKS, POLICY_LINKS } from "@/lib/navigation";
import { X_PROFILE_URL } from "@/lib/site-config";
import { FONT_DISPLAY } from "@/theme/themeConstants";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * スマホ用のナビゲーション。主要導線・購入CTA・規約リンク・X を1画面にまとめ、
 * フッターまでスクロールしなくても全ページへ移動できるようにする。
 * 各項目はタップしやすいよう高さ 48px 以上を確保する。
 */
export default function MobileNavDrawer({ open, onClose }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "min(86vw, 360px)",
          display: "flex",
          flexDirection: "column",
          pb: "env(safe-area-inset-bottom)",
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pt: 1 }}>
        <IconButton aria-label="メニューを閉じる" onClick={onClose} sx={{ width: 48, height: 48 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box component="nav" aria-label="メインメニュー" sx={{ px: 3 }}>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {NAV_LINKS.map((item) => (
            <Box component="li" key={item.href} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <Box
                component={Link}
                href={item.href}
                onClick={onClose}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 56,
                  fontFamily: FONT_DISPLAY,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "text.primary",
                  textDecoration: "none",
                }}
              >
                {item.label}
                <Box component="span" aria-hidden="true" sx={{ color: "primary.main" }}>→</Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Button
          component={Link}
          href="/products"
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{ mt: 3, minHeight: 52, fontSize: "15px" }}
        >
          購入する →
        </Button>
      </Box>

      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {POLICY_LINKS.map((item) => (
            <Box component="li" key={item.href}>
              <Box
                component={Link}
                href={item.href}
                onClick={onClose}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 44,
                  fontSize: "14px",
                  color: "text.secondary",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Box>
            </Box>
          ))}
        </Box>
        <Box
          component="a"
          href={X_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1.25,
            minHeight: 44,
            mt: 1,
            fontSize: "14px",
            color: "text.primary",
            textDecoration: "none",
          }}
        >
          <XIcon size={18} /> X（旧Twitter）
        </Box>
      </Box>
    </Drawer>
  );
}
