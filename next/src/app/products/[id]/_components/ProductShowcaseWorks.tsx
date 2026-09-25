import { Box } from "@mui/material";
import Link from "next/link";
import SectionContainer from "@/components/SectionContainer";
import SectionHeader from "@/components/SectionHeader";
import WorkImage from "@/components/gallery/WorkImage";
import { CardTitle, ProductCardFrame } from "@/components/product/ProductCardPrimitives";
import { getGalleryCategoryLabel } from "@/lib/constants/categories";
import type { WorkSummary } from "@/lib/types/work";

interface Props {
  works: WorkSummary[];
}

/**
 * 商品詳細の「この商品を使った展示例」。
 * 各作品は /gallery?work={id} へリンクし、ギャラリー側で拡大表示を開いた状態にする。
 */
const ProductShowcaseWorks: React.FC<Props> = ({ works }) => {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <SectionContainer>
        <SectionHeader title="In Display" titleJa="この商品を使った展示例" marginBottom={6} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {works.map((work) => (
            <Link
              key={work.id}
              href={`/gallery?work=${work.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <ProductCardFrame hoverShadow={false}>
                <Box sx={{ position: "relative", aspectRatio: "4 / 5", bgcolor: "background.alt" }}>
                  {work.image && (
                    <WorkImage src={work.image} alt={work.title} sizes="(max-width: 600px) 50vw, 25vw" />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <Box
                    sx={{
                      fontSize: "11px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    {getGalleryCategoryLabel(work.category)}
                  </Box>
                  <CardTitle variant="compact">{work.title}</CardTitle>
                  <Box sx={{ fontSize: "12px", fontWeight: 600, color: "primary.main" }}>
                    ギャラリーで見る →
                  </Box>
                </Box>
              </ProductCardFrame>
            </Link>
          ))}
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default ProductShowcaseWorks;
