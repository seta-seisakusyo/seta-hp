import { Box, Button } from "@mui/material";
import Link from "next/link";
import { getProductInquiryHref, type Product } from "@/lib/types/product";
import { FONT_DISPLAY } from "@/theme/themeConstants";

interface Props {
  product: Pick<Product, "name" | "price" | "purchaseUrl">;
}

/**
 * スマホで価格と購入（または問い合わせ）ボタンを画面下に固定するバー。
 * スマホでは本文の下にある購入ボタンまで何度もスクロールが必要なため、常に手の届く位置に出す。
 * 商品ページ本文の末尾に置いて position: sticky で下端に張り付かせる。
 * fixed と違ってフッターに重ならず、ページ末尾では本来の位置に収まる。
 */
export default function ProductPurchaseBar({ product }: Props) {
  const buttonSx = { flex: 1, minHeight: 48, fontSize: "15px", whiteSpace: "nowrap" } as const;

  return (
    <Box
      sx={{
        display: { xs: "flex", md: "none" },
        position: "sticky",
        bottom: 0,
        zIndex: 10,
        alignItems: "center",
        gap: 2,
        px: 2,
        pt: 1.25,
        pb: "calc(10px + env(safe-area-inset-bottom))",
        bgcolor: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, flexShrink: 0 }}>
        <Box sx={{ fontFamily: FONT_DISPLAY, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>
          ¥{product.price.toLocaleString()}
        </Box>
        <Box sx={{ fontSize: "12px", color: "text.secondary" }}>税込</Box>
      </Box>
      {product.purchaseUrl ? (
        <Button
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          sx={{ ...buttonSx, bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
        >
          BASE で購入する →
        </Button>
      ) : (
        <Button component={Link} href={getProductInquiryHref(product.name)} variant="contained" sx={buttonSx}>
          この商品を問い合わせる
        </Button>
      )}
    </Box>
  );
}
