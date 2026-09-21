"use client";

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { IMAGE_ACCEPT, IMAGE_UPLOAD_HINT } from "@/lib/image-upload-constants";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

const DEFAULT_MAX_IMAGES = 10;

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** 添付上限。X投稿など媒体側の制限が異なる画面から上書きする。 */
  maxImages?: number;
}

export default function MultiImageUpload({
  value,
  onChange,
  maxImages = DEFAULT_MAX_IMAGES,
}: MultiImageUploadProps) {
  const { error, uploading, fileInputRef, handleFileSelect, openFileDialog } = useImageUpload({
    currentCount: value.length,
    maxFiles: maxImages,
    onUploaded: (urls) => onChange([...value, ...urls]),
  });

  const handleRemove = (index: number) => {
    const newImages = [...value];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...value];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={uploading}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {value.map((url, index) => (
          <Box
            key={url}
            sx={{
              position: "relative",
              width: 120,
              height: 120,
              borderRadius: 1,
              overflow: "hidden",
              border: index === 0 ? "2px solid" : "1px solid",
              borderColor: index === 0 ? "primary.main" : "grey.300",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`画像 ${index + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              onClick={() => handleMoveUp(index)}
            />
            {index === 0 && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "white",
                  fontSize: "10px",
                  textAlign: "center",
                  py: 0.25,
                }}
              >
                メイン
              </Box>
            )}
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                bgcolor: "rgba(255,255,255,0.9)",
                p: 0.5,
                "&:hover": { bgcolor: "rgba(255,255,255,1)" },
              }}
              onClick={() => handleRemove(index)}
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Box>
        ))}

        {value.length < maxImages && (
          <Button
            variant="outlined"
            onClick={openFileDialog}
            disabled={uploading}
            sx={{
              width: 120,
              height: 120,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              borderStyle: "dashed",
            }}
          >
            {uploading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <AddPhotoAlternateIcon />
                <Typography variant="caption">追加</Typography>
              </>
            )}
          </Button>
        )}
      </Box>

      {error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
          {error}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        {IMAGE_UPLOAD_HINT} - {value.length}/{maxImages}枚
        {value.length > 1 && " - クリックで順番変更"}
      </Typography>
    </Box>
  );
}
