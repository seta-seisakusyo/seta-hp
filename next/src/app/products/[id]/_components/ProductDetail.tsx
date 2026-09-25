import { Box } from "@mui/material";
import Link from "next/link";
import ProductImageGallery from "../ProductImageGallery";
import { getProductCategoryLabel, getStockMeta } from "@/lib/constants/categories";
import {
  type Product,
  getProductInquiryHref,
  getPurchaseLinks,
  parseTags,
  parseProductImages,
} from "@/lib/types/product";
import { formatRefNumber } from "@/lib/format";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

interface Props {
  product: Product;
}

// サーバーコンポーネント: フォントは themeConstants から直接参照する
// （useTheme のためだけにクライアント化しない。インタラクティブな画像ギャラリーのみ client リーフ）
const ProductDetail: React.FC<Props> = ({ product }) => {

  const tags = parseTags(product.tags);
  const productImages = parseProductImages(product.images);
  const purchaseLinks = getPurchaseLinks(product);
  const hasPurchaseLinks = purchaseLinks.length > 0;

  const ref = formatRefNumber(product.id);
  const stockMeta = getStockMeta(product.stock);
  const stockVariant = stockMeta
    ? { ...stockMeta.detail, label: stockMeta.label }
    : { bg: "#F6F6F4", color: "#6B6B6B", label: product.stock };

  return (
    <Box>
      {/* Breadcrumb */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: { xs: 2, md: 4 },
          fontSize: "13px",
          letterSpacing: "0.08em",
          color: "text.secondary",
          // タップ領域の高さを確保する（見た目の文字サイズは変えない）
          "& a": { display: "inline-flex", alignItems: "center", minHeight: 40, color: "inherit", textDecoration: "none" },
        }}
      >
        <Link href="/">Home</Link>
        <Box sx={{ color: "text.disabled" }}>/</Box>
        <Link href="/products">Catalogue</Link>
        <Box sx={{ color: "text.disabled" }}>/</Box>
        <Box sx={{ color: "text.primary", fontWeight: 500 }}>Ref. {ref}</Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
          gap: { xs: 5, md: 8 },
          alignItems: "start",
        }}
      >
        {/* Left: Image gallery */}
        <Box>
          <ProductImageGallery images={productImages} productName={product.name} />
        </Box>

        {/* Right: Product info */}
        <Box sx={{ position: { md: "sticky" }, top: { md: 100 } }}>
          {/* Eyebrow */}
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                fontFamily: FONT_ITALIC,
                fontStyle: "italic",
                color: "primary.main",
                fontSize: "14px",
                letterSpacing: "0.05em",
              }}
            >
              Ref. {ref}
            </Box>
            <Box
              sx={{
                fontSize: "12px",
                color: "text.secondary",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {getProductCategoryLabel(product.category)}
            </Box>
          </Box>

          {/* Product Name */}
          <Box
            component="h1"
            sx={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "text.primary",
              mt: 0,
              mb: 3,
            }}
          >
            {product.name}
          </Box>

          {/* Price */}
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 1.5,
              pb: 3,
              mb: 3,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                fontFamily: FONT_DISPLAY,
                fontSize: "44px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "text.primary",
                lineHeight: 1,
              }}
            >
              ¥{product.price.toLocaleString()}
            </Box>
            <Box
              sx={{
                fontSize: "13px",
                color: "text.secondary",
                letterSpacing: "0.08em",
              }}
            >
              税込
            </Box>
          </Box>

          {/* Stock */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.625,
              borderRadius: "999px",
              bgcolor: stockVariant.bg,
              color: stockVariant.color,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              mb: 4,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: stockVariant.color }} />
            {stockVariant.label}
          </Box>

          {/* Description */}
          <Box
            sx={{
              fontSize: "14.5px",
              color: "secondary.main",
              lineHeight: 1.9,
              whiteSpace: "pre-wrap",
              mb: 3,
            }}
          >
            {product.description}
          </Box>

          {/* Tags */}
          {tags.length > 0 && (
            <Box sx={{ mb: 4, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {tags.map((tag) => (
                <Box
                  key={tag}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "999px",
                    fontSize: "12px",
                    color: "text.secondary",
                    letterSpacing: "0.05em",
                  }}
                >
                  #{tag}
                </Box>
              ))}
            </Box>
          )}

          {/* Shipping note */}
          <Box
            sx={{
              fontSize: "12px",
              color: "text.secondary",
              mb: 4,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "6px",
              lineHeight: 1.7,
            }}
          >
            緩衝材入りの梱包と配送保険付き。
            通常 3〜7 営業日で発送します。
          </Box>

          {/* CTAs */}
          <Box sx={{ display: "flex", gap: 1.5, flexDirection: "column" }}>
            {purchaseLinks.map((link, i) => (
              <a
                key={link.store}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.25,
                    // 先頭の購入先（BASE、なければ Amazon）を銅色、2つ目を黒で区別する
                    bgcolor: i === 0 ? "primary.main" : "background.dark",
                    color: "#FFFFFF",
                    width: "100%",
                    px: 3,
                    py: 2,
                    borderRadius: "999px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background-color 0.2s, transform 0.2s",
                    "&:hover": {
                      bgcolor: i === 0 ? "primary.dark" : "primary.main",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  {link.store} で購入する <span>→</span>
                </Box>
              </a>
            ))}
            {hasPurchaseLinks && (
              <Box sx={{ fontSize: "12px", color: "text.secondary", mt: -0.5, textAlign: "center" }}>
                外部サイト（{purchaseLinks.map((link) => link.store).join(" / ")}）に移動します
              </Box>
            )}
            <Link
              href={getProductInquiryHref(product.name)}
              style={{ textDecoration: "none" }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.25,
                  bgcolor: hasPurchaseLinks ? "#FFFFFF" : "background.dark",
                  color: hasPurchaseLinks ? "text.primary" : "#FFFFFF",
                  border: hasPurchaseLinks ? "1px solid" : "none",
                  borderColor: "divider",
                  width: "100%",
                  px: 3,
                  py: 2,
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s, transform 0.2s",
                  "&:hover": hasPurchaseLinks
                    ?{ bgcolor: "background.alt", transform: "translateY(-1px)" }
                    : { bgcolor: "primary.main", transform: "translateY(-1px)" },
                }}
              >
                この商品について問い合わせる <span>→</span>
              </Box>
            </Link>
          </Box>

          {/* Spec divider note */}
          <Box
            sx={{
              mt: 5,
              pt: 4,
              borderTop: "1px solid",
              borderColor: "divider",
              fontSize: "12px",
              color: "text.secondary",
              lineHeight: 1.7,
            }}
          >
            <Box sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "13px", color: "text.primary", mb: 1, letterSpacing: "-0.01em" }}>
              Made-to-order
            </Box>
            一品から制作します。サイズや形状のカスタマイズも可能ですので、お気軽にご相談ください。
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductDetail;
