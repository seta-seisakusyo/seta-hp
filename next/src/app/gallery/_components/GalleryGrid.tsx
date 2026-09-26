"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Dialog, IconButton, type SxProps, type Theme } from "@mui/material";
import Link from "next/link";
import CloseIcon from "@mui/icons-material/Close";
import EmptyState from "@/components/EmptyState";
import SectionContainer from "@/components/SectionContainer";
import WorkImage from "@/components/gallery/WorkImage";
import { getGalleryCategoryLabel } from "@/lib/constants/categories";
import { formatRefNumber } from "@/lib/format";
import type { WorkGridItem, WorkProductLink } from "@/lib/types/work";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

interface Props {
  works: WorkGridItem[];
  /** /gallery?work={id} で指定された作品。存在すれば開いた状態で表示する */
  initialWorkId?: number | null;
}

const workCardId = (id: number) => `work-${id}`;

// 作品画像の枠の縦横比。サムネイルと拡大表示で揃える。
// スマホは正方形にして横長写真の上下の余白を減らし、それ以上は縦長（4:5）。
const WORK_IMAGE_ASPECT = { xs: "1 / 1", sm: "4 / 5" } as const;

/** 「この展示に使った商品」のリンク一覧。tone はカード（明）と拡大表示（暗）の配色 */
function WorkProductLinks({
  products,
  tone,
  sx,
}: {
  products: WorkProductLink[];
  tone: "light" | "dark";
  sx?: SxProps<Theme>;
}) {
  if (products.length === 0) return null;
  const dark = tone === "dark";

  return (
    <Box
      // カード全体のクリック（拡大表示）とキー操作をリンク側で止める
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      sx={sx}
    >
      <Box
        sx={{
          fontSize: "12px",
          letterSpacing: "0.12em",
          color: dark ? "rgba(255,255,255,0.72)" : "text.secondary",
          fontWeight: 500,
          mb: 0.25,
        }}
      >
        この展示に使った商品
      </Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", columnGap: 2 }}>
        {products.map((product) => (
          <Box component="li" key={product.id}>
            <Box
              component={Link}
              href={`/products/${product.id}`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                minHeight: 40,
                fontSize: "13px",
                fontWeight: 500,
                color: dark ? "#FFFFFF" : "primary.main",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                textDecorationColor: dark ? "rgba(255,255,255,0.4)" : "rgba(180,83,9,0.35)",
                transition: "text-decoration-color 0.2s ease",
                "&:hover": { textDecorationColor: "currentColor" },
              }}
            >
              {product.name} <span aria-hidden="true">→</span>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const GalleryGrid: React.FC<Props> = ({ works, initialWorkId = null }) => {
  const initialWork = works.find((work) => work.id === initialWorkId) ?? null;
  const [selectedWork, setSelectedWork] = useState<WorkGridItem | null>(null);

  // 指定作品はマウント後に拡大表示を開く。初回描画から開いた状態にすると、
  // Dialog のスタイル適用前にフォーカス移動が走り、背面ページがスクロールしてしまう。
  // 画像がなく拡大表示を開けない作品は、カードまでスクロールして位置を示す。
  useEffect(() => {
    if (!initialWork) return;
    if (initialWork.image) {
      setSelectedWork(initialWork);
    } else {
      document.getElementById(workCardId(initialWork.id))?.scrollIntoView({ block: "center" });
    }
  }, [initialWork]);

  const closeWork = useCallback(() => {
    setSelectedWork(null);
    // 閉じた後の再読み込みで開き直さないよう ?work= を取り除く
    if (new URLSearchParams(window.location.search).has("work")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  if (works.length === 0) {
    return (
      <EmptyState title="作品を準備中" description="撮影が完了次第、順次掲載していきます。" />
    );
  }

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: { xs: 3, md: 4 },
          }}
        >
          {works.map((work, idx) => (
            <Box
              key={work.id}
              id={workCardId(work.id)}
              role={work.image ? "button" : undefined}
              tabIndex={work.image ? 0 : undefined}
              aria-label={work.image ? `${work.title} を拡大表示` : undefined}
              onClick={() => {
                if (work.image) setSelectedWork(work);
              }}
              onKeyDown={(e) => {
                if (!work.image) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedWork(work);
                }
              }}
              sx={{
                display: "flex",
                flexDirection: "column",
                cursor: work.image ? "zoom-in" : "default",
                transition: "transform 0.4s",
                "&:hover": { transform: "translateY(-4px)" },
                "&:hover .gallery-img": {
                  borderColor: "text.primary",
                },
                "&:focus-visible": {
                  outline: "2px solid #0A0A0A",
                  outlineOffset: 6,
                },
              }}
            >
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
                    No. {formatRefNumber(idx + 1)}
                  </Box>
                )}
              </Box>

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
                    No. {formatRefNumber(idx + 1)}
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
                  href={`/contact?display=${encodeURIComponent(work.title)}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
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
          ))}
        </Box>
      </SectionContainer>

      <Dialog
        open={Boolean(selectedWork)}
        onClose={closeWork}
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
        {selectedWork?.image && (
          <Box sx={{ position: "relative" }}>
            <IconButton
              aria-label="拡大画像を閉じる"
              onClick={closeWork}
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
              <WorkImage src={selectedWork.image} alt={selectedWork.title} sizes="(max-width: 600px) 92vw, 62vh" priority />
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
                {selectedWork.title}
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
                {getGalleryCategoryLabel(selectedWork.category)}
              </Box>
            </Box>
            <WorkProductLinks products={selectedWork.products} tone="dark" sx={{ mt: 2 }} />
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default GalleryGrid;
