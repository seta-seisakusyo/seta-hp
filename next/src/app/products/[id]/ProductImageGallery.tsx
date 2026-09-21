"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import Image from "next/image";
import StyleIcon from "@mui/icons-material/Style";
import { isUploadedImageUrl } from "@/lib/images";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          paddingTop: "100%",
          bgcolor: "#F8F8F8",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StyleIcon sx={{ fontSize: 80, color: "#DDD" }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* メイン画像 */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          paddingTop: "100%",
          bgcolor: "#F8F8F8",
          borderRadius: 2,
          overflow: "hidden",
          mb: 2,
        }}
      >
        <Image
          src={images[selectedIndex]}
          alt={`${productName} - 画像 ${selectedIndex + 1}`}
          fill
          unoptimized={isUploadedImageUrl(images[selectedIndex])}
          style={{ objectFit: "cover" }}
          priority
        />
      </Box>

      {/* サムネイル一覧 */}
      {images.length > 1 && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 1,
            "&::-webkit-scrollbar": {
              height: 6,
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "#F5F5F5",
              borderRadius: 3,
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#DDD",
              borderRadius: 3,
            },
          }}
        >
          {images.map((image, index) => (
            <Box
              key={index}
              role="button"
              tabIndex={0}
              aria-label={`${productName} - 画像 ${index + 1} を表示`}
              aria-pressed={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedIndex(index);
                }
              }}
              sx={{
                position: "relative",
                width: 72,
                height: 72,
                minWidth: 72,
                borderRadius: 1,
                overflow: "hidden",
                cursor: "pointer",
                border: "2px solid",
                borderColor: selectedIndex === index ? "primary.main" : "transparent",
                opacity: selectedIndex === index ? 1 : 0.7,
                transition: "all 0.2s ease",
                "&:hover, &:focus-visible": {
                  opacity: 1,
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              <Image
                src={image}
                alt={`${productName} - サムネイル ${index + 1}`}
                fill
                unoptimized={isUploadedImageUrl(image)}
                style={{ objectFit: "cover" }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
