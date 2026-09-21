import type { ReactNode } from "react";
import { Box } from "@mui/material";
import Image from "next/image";
import { isUploadedImageUrl } from "@/lib/images";
import { FONT_DISPLAY, FONT_ITALIC } from "@/theme/themeConstants";

interface ProductCardFrameProps {
  children: ReactNode;
  hoverShadow?: boolean;
}

export function ProductCardFrame({ children, hoverShadow = true }: ProductCardFrameProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "6px",
        overflow: "hidden",
        cursor: "pointer",
        bgcolor: "#FFFFFF",
        transition: hoverShadow
          ? "transform 0.4s, border-color 0.3s, box-shadow 0.3s"
          : "transform 0.4s, border-color 0.3s",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: "text.primary",
          ...(hoverShadow && { boxShadow: "0 22px 40px -22px rgba(10,10,10,0.2)" }),
        },
      }}
    >
      {children}
    </Box>
  );
}

interface ProductCardMediaProps {
  src: string | null;
  alt: string;
  sizes: string;
  aspectRatio?: string;
  background?: string;
  placeholder?: ReactNode;
  placeholderColor?: string;
  placeholderFontSize?: string;
  placeholderLetterSpacing?: string;
  badge?: ReactNode;
}

export function ProductCardMedia({
  src,
  alt,
  sizes,
  aspectRatio = "4 / 5",
  background = "linear-gradient(150deg, #F6F6F4 0%, #EDEDE8 100%)",
  placeholder,
  placeholderColor = "text.disabled",
  placeholderFontSize = "15px",
  placeholderLetterSpacing = "0.04em",
  badge,
}: ProductCardMediaProps) {
  return (
    <Box sx={{ position: "relative", aspectRatio, background, overflow: "hidden" }}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={isUploadedImageUrl(src)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        placeholder && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: placeholderColor,
              fontFamily: FONT_ITALIC,
              fontStyle: "italic",
              fontSize: placeholderFontSize,
              letterSpacing: placeholderLetterSpacing,
            }}
          >
            {placeholder}
          </Box>
        )
      )}
      {badge}
    </Box>
  );
}

interface ProductPriceRowProps {
  price: number;
  variant?: "full" | "compact";
  paddingTop?: number | string;
}

export function ProductPriceRow({ price, variant = "full", paddingTop = 2 }: ProductPriceRowProps) {
  if (variant === "compact") {
    return (
      <Box
        sx={{
          fontFamily: FONT_DISPLAY,
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "-0.015em",
          color: "text.primary",
        }}
      >
        ¥{price.toLocaleString()}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        pt: paddingTop,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          fontFamily: FONT_DISPLAY,
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "text.primary",
        }}
      >
        ¥{price.toLocaleString()}
      </Box>
      <Box
        sx={{
          fontSize: "11px",
          color: "text.secondary",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        税込
      </Box>
    </Box>
  );
}
