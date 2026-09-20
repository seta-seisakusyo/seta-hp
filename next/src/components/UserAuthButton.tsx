"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  // ローディング中
  if (status === "loading") {
    return (
      <IconButton disabled>
        <PersonOutlineIcon sx={{ color: "#CCC" }} />
      </IconButton>
    );
  }

  // 未ログイン時
  if (status === "unauthenticated") {
    return (
      <Link href="/login">
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: "#333",
            borderColor: "#DDD",
            borderRadius: "50px",
            px: 2,
            fontWeight: 500,
            fontSize: "13px",
            "&:hover": {
              borderColor: "#333",
              bgcolor: "transparent",
            },
          }}
        >
          ログイン
        </Button>
      </Link>
    );
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

        {/* X投稿は外部への発信で取り消しが効かないため ADMIN 限定（/x-post も requireAdmin） */}
        {isDesignerAdmin && (
          <MenuItem
            key="x-post"
            onClick={() => {
              handleMenuClose();
              router.push("/x-post");
            }}
          >
            <Typography variant="body2" sx={{ color: "primary.main" }}>
              X 投稿
            </Typography>
          </MenuItem>
        )}

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
