import { Box, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WorkImage from "@/components/gallery/WorkImage";
import { getGalleryCategoryLabel } from "@/lib/constants/categories";
import type { WorkGridItem } from "@/lib/types/work";
import { FONT_DISPLAY } from "@/theme/themeConstants";
import WorkProductLinks from "./WorkProductLinks";
import { WORK_IMAGE_ASPECT } from "./work-gallery";

interface Props {
  /** 拡大表示中の作品。null なら閉じている */
  work: WorkGridItem | null;
  onClose: () => void;
}

/** 作品の拡大表示（画像・タイトル・カテゴリ・使用商品） */
export default function WorkLightbox({ work, onClose }: Props) {
  return (
    <Dialog
      open={Boolean(work)}
      onClose={onClose}
      maxWidth={false}
      // 画像下のタイトル・使用商品リンクが画面に収まらない場合（スマホ・商品が多い作品）も
      // 最後までスクロールできるよう、ダイアログ全体をスクロールさせる。
      scroll="body"
      PaperProps={{
        sx: {
          bgcolor: "transparent",
          boxShadow: "none",
          overflow: "visible",
          // サムネイルと同じ縦横比の枠を、画面に収まる最大サイズで表示する。
          // 幅の上限は「使える高さ × 縦横比」（スマホ 1:1 は高さ 60vh、それ以上 4:5 は 78vh）
          width: { xs: "min(92vw, 60vh)", sm: "min(92vw, calc(78vh * 4 / 5))" },
          // 上余白は閉じるボタン（Paper の上に配置）が画面内に収まる分
          mx: 0,
          my: { xs: 8, md: 9 },
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: "rgba(10,10,10,0.82)",
            backdropFilter: "blur(8px)",
          },
        },
      }}
    >
      {work?.image && (
        <Box sx={{ position: "relative" }}>
          <IconButton
            aria-label="拡大画像を閉じる"
            onClick={onClose}
            sx={{
              position: "absolute",
              top: { xs: -44, md: -52 },
              right: 0,
              color: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.22)",
              bgcolor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.14)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: WORK_IMAGE_ASPECT,
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <WorkImage src={work.image} alt={work.title} sizes="(max-width: 600px) 92vw, 62vh" priority />
          </Box>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 2,
              color: "#FFFFFF",
            }}
          >
            <Box
              sx={{
                fontFamily: FONT_DISPLAY,
                fontSize: { xs: "18px", md: "24px" },
                fontWeight: 700,
                letterSpacing: "-0.015em",
              }}
            >
              {work.title}
            </Box>
            <Box
              sx={{
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {getGalleryCategoryLabel(work.category)}
            </Box>
          </Box>
          <WorkProductLinks products={work.products} tone="dark" sx={{ mt: 2 }} />
        </Box>
      )}
    </Dialog>
  );
}
