"use client";

import { Alert, Box, Typography } from "@mui/material";
import Link from "next/link";
import { COLOR_PRIMARY } from "@/theme/themeConstants";

interface Props {
  title: string;
  subtitle: string;
  error: string | null;
  footerText: string;
  footerLinkHref: string;
  footerLinkLabel: string;
  children: React.ReactNode;
}

/**
 * ログイン/新規登録で共用する認証カード。
 * 枠・見出し・エラー表示・フッターリンクを共通化し、フォーム本体は children で渡す。
 */
export default function AuthCard({
  title,
  subtitle,
  error,
  footerText,
  footerLinkHref,
  footerLinkLabel,
  children,
}: Props) {
  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        border: "1px solid #EAEAEA",
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontWeight: 700,
          fontSize: { xs: "1.5rem", md: "1.8rem" },
          color: "#333",
          textAlign: "center",
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "#666", textAlign: "center", mb: 4 }}>
        {subtitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {children}

      <Typography variant="body2" sx={{ color: "#666", textAlign: "center", mt: 3 }}>
        {footerText}{" "}
        <Link
          href={footerLinkHref}
          // タップ領域の高さを確保する（行内のまま上下に広げる）
          style={{ color: COLOR_PRIMARY, fontWeight: 500, textDecoration: "none", display: "inline-block", padding: "12px 4px" }}
        >
          {footerLinkLabel}
        </Link>
      </Typography>
    </Box>
  );
}
