import { Box } from "@mui/material";
import Image from "next/image";
import { isUploadedImageUrl } from "@/lib/images";

const FALLBACK_IMAGE_BG = "#F6F6F4";

interface WorkImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}

/**
 * ギャラリー作品の画像。全体が見えるよう contain で表示し、余白は淡いグレー＋微グラデで統一する。
 * 以前は各画像を canvas で再ダウンロードしてドミナントカラーを抽出していたが、
 * ギャラリーの画像帯域が2倍になるため廃止（#199）。
 * 親要素に position: relative と寸法が必要。
 */
export default function WorkImage({ src, alt, sizes, priority }: WorkImageProps) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: FALLBACK_IMAGE_BG,
        backgroundImage: `linear-gradient(180deg, ${FALLBACK_IMAGE_BG} 0%, rgba(255,255,255,0.45) 100%)`,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isUploadedImageUrl(src)}
        style={{ objectFit: "contain", objectPosition: "center center" }}
      />
    </Box>
  );
}
