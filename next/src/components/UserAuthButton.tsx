"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isAdminRole, isEditorRole } from "@/lib/roles";

export default function UserAuthButton() {
  const { data: session, status } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut({ callbackUrl: "/" });
  };

  // 一般訪問者にログイン導線を見せない（#258）。
  // /login は Nginx 層でIP制限済み（#251）で、ボタンを出しても到達できる人は限られる。
  // ログイン済みかどうかが確定するまでは何も描画しない。
  // プレースホルダを出すと、未ログイン時に一瞬アイコンが見えてから消える挙動になる。
  if (status !== "authenticated") {
    return null;
  }

  // ログイン済み
  const isAdmin = isEditorRole(session?.user?.role);
  // 飾Love Designer は ADMIN のみアクセス可（verify-admin が ADMIN 限定のため）。
  const isDesignerAdmin = isAdminRole(session?.user?.role);
  const designerUrl =
    process.env.NEXT_PUBLIC_DESIGNER_URL || "https://designer.kaza-love.com";

  return (
    <>
      <IconButton onClick={handleMenuOpen}>
        <Avatar
          src={session?.user?.image || undefined}
          alt={session?.user?.name || "User"}
          sx={{ width: 32, height: 32, bgcolor: "primary.main" }}
        >
          {!session?.user?.image && session?.user?.name?.[0]?.toUpperCase()}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#333" }}>
            {session?.user?.name}
          </Typography>
          <Typography variant="caption" sx={{ color: "#666" }}>
            {session?.user?.email}
          </Typography>
        </Box>

        {isAdmin && [
          <Divider key="admin-divider" sx={{ my: 1 }} />,
          <MenuItem
            key="products-manage"
            onClick={() => {
              handleMenuClose();
              router.push("/products-manage");
            }}
          >
            <Typography variant="body2" sx={{ color: "primary.main" }}>
              商品管理
            </Typography>
          </MenuItem>,
          <MenuItem
            key="gallery-manage"
            onClick={() => {
              handleMenuClose();
              router.push("/gallery-manage");
            }}
          >
            <Typography variant="body2" sx={{ color: "primary.main" }}>
              ギャラリー管理
            </Typography>
          </MenuItem>,
        ]}

        {isDesignerAdmin && (
          <MenuItem
            key="designer"
            onClick={() => {
              handleMenuClose();
              window.open(designerUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <Typography variant="body2" sx={{ color: "primary.main" }}>
              飾Love Designer ↗
            </Typography>
          </MenuItem>
        )}

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={handleLogout}>
          <Typography variant="body2" sx={{ color: "#999" }}>
            ログアウト
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
