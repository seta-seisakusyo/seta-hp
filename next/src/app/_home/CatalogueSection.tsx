import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import {
  COMPACT_CARD_LAYOUT_SX,
  ProductCardFrame,
  ProductCardMedia,
  ProductPriceRow,
} from "@/components/product/ProductCardPrimitives";
import { FONT_DISPLAY, FONT_ITALIC, PHRASE_WRAP_SX } from "@/theme/themeConstants";
import Link from "next/link";
import type { ProductSummary } from "@/lib/types/product";
import SplitSectionHeading from "./SplitSectionHeading";

interface CatalogueSectionProps {
  products: ProductSummary[];
}

// 商品名から「N枚」を読み取り、Ref番号やバッジを導出する。
type CatalogueMeta = {
  ref: string | null; // Ref. 008 形式
  cap: string | null; // 8枚展示
  badge: string | null; // 8 Cards
  label: string | null; // 画像未設定時のプレースホルダー見出し
};

function catalogueMeta(name: string): CatalogueMeta {
  const match = name.match(/(\d+)\s*枚/);
  const count = match ? Number(match[1]) : null;
  if (!count) return { ref: null, cap: null, badge: null, label: null };
  const padded = String(count).padStart(3, "0");
  return {
    ref: `Ref. ${padded}`,
    cap: `${count}枚展示`,
    badge: `${count} Cards`,
    label: `No. ${padded}`,
  };
}

const CatalogueSection = ({ products }: CatalogueSectionProps) => {

  // 公開商品が無ければセクションごと非表示
  if (products.length === 0) return null;

  return (
    <Box component="section" id="products" sx={{ py: { xs: 6, md: 9 } }}>
      <SectionContainer>
        <SplitSectionHeading
          title={<>ライン<br /><em>ナップ。</em></>}
          description={
            <>
              アクリルから一つずつレーザー切削、手仕上げ。
              <br />
              MLBカード・トレカを美しく飾るためのディスプレイをお届けします。
              <Box
                sx={{
                  display: "block",
                  mt: 1.5,
                  color: "text.secondary",
                  fontFamily: FONT_ITALIC,
                  fontStyle: "italic",
                }}
              >
                — Handmade, one at a time.
              </Box>
            </>
          }
        />

        {/* Products */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: { xs: 2, md: 3.5 },
          }}
        >
          {products.map((p) => {
            const meta = catalogueMeta(p.name);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ProductCardFrame>
                  {/* スマホは画像左・情報右の横並びにして、1商品が画面を占有しないようにする */}
                  <Box sx={COMPACT_CARD_LAYOUT_SX}>
                  {/* Media */}
                  <ProductCardMedia
                    src={p.image}
                    alt={p.name}
                    sizes="(max-width: 960px) 100vw, 33vw"
                    background={p.image
                      ? "#F4F4F0"
                      : "linear-gradient(150deg, #F4F4F0 0%, #E7E7E0 100%)"}
                    placeholder={meta.label}
                    placeholderColor="#B9B9B0"
                    badge={meta.badge && (
                      <Box
                        component="span"
                        sx={{
                          position: "absolute",
                          top: "16px",
                          left: "16px",
                          bgcolor: "#FFFFFF",
                          color: "text.primary",
                          px: "10px",
                          py: "5px",
                          borderRadius: "999px",
                          fontSize: { xs: "11px", md: "10px" },
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {meta.badge}
                      </Box>
                    )}
                  />

                  {/* Info */}
                  <Box sx={{ p: { xs: "16px 16px 18px", md: "24px 24px 28px" } }}>
                    {(meta.ref || meta.cap) && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          flexWrap: "wrap",
                          gap: 1,
                          mb: { xs: 1, md: "14px" },
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontFamily: FONT_ITALIC,
                            fontStyle: "italic",
                            color: "primary.main",
                            fontSize: "14px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {meta.ref}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            fontSize: "12px",
                            color: "text.secondary",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            fontWeight: 500,
                          }}
                        >
                          {meta.cap}
                        </Box>
                      </Box>
                    )}
                    <Box
                      sx={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: { xs: "15px", md: "22px" },
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.4,
                        color: "text.primary",
                        ...PHRASE_WRAP_SX,
                        // 英語ティア名の行を廃止したので、その行が持っていた下余白をここへ寄せる。
                        mb: { xs: 1.5, md: "20px" },
                      }}
                    >
                      {p.name}
                    </Box>
                    <ProductPriceRow price={p.price} paddingTop={{ xs: 1.5, md: "18px" }} />
                  </Box>
                  </Box>
                </ProductCardFrame>
              </Link>
            );
          })}
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default CatalogueSection;
