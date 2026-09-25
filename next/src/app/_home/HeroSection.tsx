import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import { FONT_DISPLAY, PHRASE_WRAP_SX } from "@/theme/themeConstants";
import Image from "next/image";
import PillLink from "@/components/PillLink";
import { isUploadedImageUrl } from "@/lib/images";

interface HeroSectionProps {
  heroImage?: string | null;
}

const HeroSection = ({ heroImage }: HeroSectionProps) => {
  const imageSrc = heroImage || "/kaza-love_logo.png";

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        py: { xs: 4, md: 6 },
        background:
          "radial-gradient(ellipse at 80% 20%, rgba(180, 83, 9, 0.04), transparent 50%), #FFFFFF",
      }}
    >
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
            gap: { xs: 4, md: 10 },
            alignItems: "center",
          }}
        >
          {/* Text side */}
          <Box>
            <Box
              component="h1"
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(56px, 7.2vw, 108px)",
                lineHeight: 0.96,
                letterSpacing: "-0.04em",
                color: "text.primary",
                mt: 0,
                mb: { xs: 2.5, md: 4 },
                "& em": { fontStyle: "normal", color: "primary.main" },
              }}
            >
              カードは、
              <br />
              <em>飾る</em>ために
              <br />
              ある。
            </Box>

            <Box
              sx={{
                fontSize: "18px",
                lineHeight: 1.6,
                color: "secondary.main",
                mb: 1.5,
                maxWidth: 480,
                // 狭い画面で「…ディスプレ／イ。」と切れないよう、<wbr> の位置でだけ改行する
                ...PHRASE_WRAP_SX,
              }}
            >
              一枚一枚を主役にする<wbr />アクリルディスプレイ。
            </Box>

            <Box
              sx={{
                fontSize: "13.5px",
                color: "text.secondary",
                letterSpacing: "0.04em",
                lineHeight: 1.85,
                maxWidth: 460,
                mb: { xs: 3.5, md: 5 },
                ...PHRASE_WRAP_SX,
              }}
            >
              飾るカードが主役になるよう
              <br />
              シンプルかつ<wbr />機能性のあるデザインを<wbr />探究しました
            </Box>

            {/* CTA */}
            <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap" }}>
              <PillLink href="#products" showArrow>カタログを見る</PillLink>
            </Box>

          </Box>

          {/* Visual side */}
          <Box
            sx={{
              position: "relative",
              // 正方形にして、ヒーローの縦の占有（見出しの上下にできる空白）を抑える
              aspectRatio: "1 / 1",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow:
                "0 30px 60px -20px rgba(10,10,10,0.3), 0 18px 36px -18px rgba(180,83,9,0.15)",
            }}
          >
            <Image
              src={imageSrc}
              alt="飾Love アクリル壁面ディスプレイ"
              fill
              sizes="(max-width: 960px) 100vw, 50vw"
              unoptimized={isUploadedImageUrl(imageSrc)}
              priority
              style={{ objectFit: "cover" }}
            />
          </Box>
        </Box>
      </SectionContainer>
    </Box>
  );
};

export default HeroSection;
