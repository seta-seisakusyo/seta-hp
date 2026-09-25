import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import SectionHeader from "@/components/SectionHeader";
import {
  CardTitle,
  ProductCardFrame,
  ProductCardMedia,
  ProductPriceRow,
} from "@/components/product/ProductCardPrimitives";
import { FONT_ITALIC } from "@/theme/themeConstants";
import Link from "next/link";
import { type ProductSummary } from "@/lib/types/product";
import { formatRefNumber } from "@/lib/format";

interface Props {
  products: ProductSummary[];
}

const RelatedProducts: React.FC<Props> = ({ products }) => {
  return (
    <Box component="section" sx={{ bgcolor: "background.alt", py: { xs: 8, md: 12 } }}>
      <SectionContainer>
        <SectionHeader title="Related" titleJa="関連商品" marginBottom={6} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {products.map((p) => {
            const ref = formatRefNumber(p.id);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ProductCardFrame hoverShadow={false}>
                  <ProductCardMedia
                    src={p.image}
                    alt={p.name}
                    sizes="(max-width: 600px) 50vw, 25vw"
                    aspectRatio="1 / 1"
                    placeholder={`No. ${ref}`}
                    placeholderFontSize="13px"
                    placeholderLetterSpacing="normal"
                  />
                  <Box sx={{ p: 2 }}>
                    <Box
                      sx={{
                        fontFamily: FONT_ITALIC,
                        fontStyle: "italic",
                        color: "primary.main",
                        fontSize: "12px",
                        letterSpacing: "0.05em",
                        mb: 0.5,
                      }}
                    >
                      Ref. {ref}
                    </Box>
                    <CardTitle variant="compact">{p.name}</CardTitle>
                    <ProductPriceRow price={p.price} variant="compact" />
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

export default RelatedProducts;
