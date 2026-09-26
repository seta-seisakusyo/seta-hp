import { Box } from "@mui/material";
import type { ProductSleeve, PurchaseLink } from "@/lib/types/product";
import { FONT_DISPLAY } from "@/theme/themeConstants";

interface Props {
  sleeve: ProductSleeve;
  /** 「スリーブなし」を選ぶ販売サイトの案内に使う */
  purchaseLinks: PurchaseLink[];
}

const mm = (value: number) => `${value}`;

function sizeText({ widthMm, heightMm, thicknessMm }: ProductSleeve): string | null {
  const parts: string[] = [];
  if (widthMm !== null && heightMm !== null) parts.push(`サイズ ${mm(widthMm)} × ${mm(heightMm)} mm`);
  if (thicknessMm !== null) parts.push(`厚み ${mm(thicknessMm)} mm`);
  return parts.length > 0 ? parts.join("・") : null;
}

/**
 * 商品詳細の「対応スリーブ」。このディスプレイで使えるスリーブと、
 * スリーブをお持ちのお客様向けの値引き（各販売サイトで「スリーブなし」を選ぶ）を案内する。
 */
export default function ProductSleeveInfo({ sleeve, purchaseLinks }: Props) {
  const size = sizeText(sleeve);
  const stores = purchaseLinks.map((link) => link.store).join("・");

  return (
    <Box
      sx={{
        mb: 4,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "6px",
        fontSize: "13px",
        color: "text.secondary",
        lineHeight: 1.7,
      }}
    >
      <Box
        sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "13px", color: "text.primary", mb: 0.75 }}
      >
        対応スリーブ
      </Box>
      <Box sx={{ color: "text.primary", fontWeight: 600 }}>
        {sleeve.name}
        {sleeve.maker && (
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            （{sleeve.maker}）
          </Box>
        )}
      </Box>
      {size && <Box>{size}</Box>}
      {sleeve.count !== null && <Box>スリーブ {sleeve.count} 枚付き</Box>}
      {sleeve.discount !== null && sleeve.discount > 0 && (
        <Box sx={{ mt: 1, color: "text.primary" }}>
          お手持ちのスリーブをお使いの場合は、
          {stores
            ? `${stores} で「スリーブなし」をお選びいただくと`
            : "お問い合わせの際にお知らせいただくと"}
          <Box component="strong" sx={{ color: "primary.main" }}>
            {" "}{sleeve.discount.toLocaleString("ja-JP")}円引き
          </Box>
          になります。
        </Box>
      )}
    </Box>
  );
}
