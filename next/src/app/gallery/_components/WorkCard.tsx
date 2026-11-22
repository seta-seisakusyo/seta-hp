import { Box } from "@mui/material";
import Link from "next/link";
import WorkImage from "@/components/gallery/WorkImage";
import { getGalleryCategoryLabel } from "@/lib/constants/categories";
import { formatRefNumber } from "@/lib/format";
import { getWorkInquiryHref } from "@/lib/types/product";
import type { WorkGridItem } from "@/lib/types/work";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";
import WorkProductLinks from "./WorkProductLinks";
import { WORK_IMAGE_ASPECT, canOpenWork, workCardId } from "./work-gallery";

interface Props {
  work: WorkGridItem;
  /** 一覧での順番（0始まり）。No. 表記に使う */
  index: number;
  onOpen: (work: WorkGridItem) => void;
}

/** 画像枠を button にするときの、ブラウザ既定のボタン装飾の打ち消し */
const IMAGE_BUTTON_RESET_SX = {
  display: "block",
  width: "100%",
  p: 0,
  m: 0,
  border: 0,
  bgcolor: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "inherit",
  borderRadius: "4px",
} as const;

/** ギャラリーの作品カード。画像がある作品は画像だけが拡大表示のボタンになる */
export default function WorkCard({ work, index, onOpen }: Props) {
  const refNumber = formatRefNumber(index + 1);
  const openable = canOpenWork(work);

  const imageFrame = (
    <Box
      className="gallery-img"
      sx={{
        position: "relative",
        aspectRatio: WORK_IMAGE_ASPECT,
        bgcolor: "background.alt",
        overflow: "hidden",
        borderRadius: "4px",
        border: "1px solid",
        borderColor: "divider",
        transition: "border-color 0.3s",
      }}
    >
      {work.image ? (
        <WorkImage
          src={work.image}
          alt={work.title}
          sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
        />
      ) : (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.disabled",
            fontFamily: FONT_ITALIC,
            fontStyle: "italic",
            fontSize: "14px",
            letterSpacing: "0.04em",
          }}
        >
          No. {refNumber}
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      id={workCardId(work.id)}
      sx={{
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.4s",
        "&:hover": { transform: "translateY(-4px)" },
        "&:hover .gallery-img": {
          borderColor: "text.primary",
        },
      }}
    >
      {openable ? (
        <Box
          component="button"
          type="button"
          aria-label={`${work.title} を拡大表示`}
          onClick={() => onOpen(work)}
          sx={{
            ...IMAGE_BUTTON_RESET_SX,
            cursor: "zoom-in",
            "&:focus-visible": {
              outline: "2px solid #0A0A0A",
              outlineOffset: 6,
            },
          }}
        >
          {imageFrame}
        </Box>
      ) : (
        imageFrame
      )}

      <Box sx={{ pt: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            mb: 1,
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
            No. {refNumber}
          </Box>
          <Box
            sx={{
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "text.secondary",
              fontWeight: 500,
            }}
          >
            {getGalleryCategoryLabel(work.category)}
          </Box>
        </Box>
        <Box
          sx={{
            fontFamily: FONT_DISPLAY,
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "-0.015em",
            color: "text.primary",
            lineHeight: 1.4,
            mb: 2,
          }}
        >
          {work.title}
        </Box>
        <WorkProductLinks products={work.products} tone="light" sx={{ mb: 2 }} />
        <Box
          component={Link}
          href={getWorkInquiryHref(work.title)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: "999px",
            border: "1px solid",
            borderColor: "divider",
            color: "text.primary",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              bgcolor: "rgba(180,83,9,0.04)",
            },
          }}
        >
          このディスプレイについて問い合わせる <span>→</span>
        </Box>
      </Box>
    </Box>
  );
}
