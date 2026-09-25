import { Box } from "@mui/material";
import { FONT_ITALIC } from "@/theme/themeConstants";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import SectionContainer from "@/components/SectionContainer";
import {
  CardTitle,
  ProductCardFrame,
  ProductCardMedia,
  ProductPriceRow,
} from "@/components/product/ProductCardPrimitives";
import { getProductCategoryLabel } from "@/lib/constants/categories";
import { parseTags, type ProductGridItem } from "@/lib/types/product";
import { formatRefNumber } from "@/lib/format";

interface Props {
  products: ProductGridItem[];
}

const ProductsGrid: React.FC<Props> = ({ products }) => {

  if (products.length === 0) {
    return <EmptyState title="商品を準備中" description="標準ラインナップを準備しています。" />;
  }

  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: { xs: 3, md: 3.5 },
          }}
        >
          {products.map((p) => {
            const tags = parseTags(p.tags);
            const isPopular = tags.includes("人気");
            const isNew = tags.includes("NEW");
            const ref = formatRefNumber(p.id);

            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ProductCardFrame>
                  <ProductCardMedia
                    src={p.image}
                    alt={p.name}
                    sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
                    placeholder={`No. ${ref}`}
                    badge={(isPopular || isNew) && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 16,
                          left: 16,
                          bgcolor: isPopular ? "primary.main" : "background.dark",
                          color: "#FFFFFF",
                          px: 1.25,
                          py: 0.625,
                          borderRadius: "999px",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {isPopular ? "Popular" : "New"}
                      </Box>
                    )}
                  />

                  <Box sx={{ p: "24px 24px 28px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          fontFamily: FONT_ITALIC,
                          fontStyle: "italic",
                          color: "primary.main",
                          fontSize: "13px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Ref. {ref}
                      </Box>
                      <Box
                        sx={{
                          fontSize: "11px",
                          color: "text.secondary",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                        }}
                      >
                        {getProductCategoryLabel(p.category)}
                      </Box>
                    </Box>
                    <CardTitle>{p.name}</CardTitle>
                    <ProductPriceRow price={p.price} />
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

export default ProductsGrid;
