import { Box, type SxProps, type Theme } from "@mui/material";
import Link from "next/link";
import type { WorkProductLink } from "@/lib/types/work";

/** 「この展示に使った商品」のリンク一覧。tone はカード（明）と拡大表示（暗）の配色 */
export default function WorkProductLinks({
  products,
  tone,
  sx,
}: {
  products: WorkProductLink[];
  tone: "light" | "dark";
  sx?: SxProps<Theme>;
}) {
  if (products.length === 0) return null;
  const dark = tone === "dark";

  return (
    <Box sx={sx}>
      <Box
        sx={{
          fontSize: "12px",
          letterSpacing: "0.12em",
          color: dark ? "rgba(255,255,255,0.72)" : "text.secondary",
          fontWeight: 500,
          mb: 0.25,
        }}
      >
        この展示に使った商品
      </Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", columnGap: 2 }}>
        {products.map((product) => (
          <Box component="li" key={product.id}>
            <Box
              component={Link}
              href={`/products/${product.id}`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                minHeight: 40,
                fontSize: "13px",
                fontWeight: 500,
                color: dark ? "#FFFFFF" : "primary.main",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                textDecorationColor: dark ? "rgba(255,255,255,0.4)" : "rgba(180,83,9,0.35)",
                transition: "text-decoration-color 0.2s ease",
                "&:hover": { textDecorationColor: "currentColor" },
              }}
            >
              {product.name} <span aria-hidden="true">→</span>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
