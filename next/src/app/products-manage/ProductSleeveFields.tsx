"use client";

import { Box, Button, TextField, Typography } from "@mui/material";
import type { SleeveForm, SleeveTextKey } from "@/lib/product-sleeve-form";

interface Props {
  value: SleeveForm;
  onChange: (value: SleeveForm) => void;
}

/** 商品編集の「対応スリーブ」欄。設計ツールから登録した商品は設計のスリーブが入る */
export default function ProductSleeveFields({ value, onChange }: Props) {
  const field = (key: SleeveTextKey) => ({
    value: value[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: e.target.value }),
  });

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        対応スリーブ（任意）
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" }, gap: 2 }}>
        <TextField label="スリーブ名" placeholder="フルプロテクトスリーブ R(レギュラー)サイズ" fullWidth {...field("name")} />
        <TextField label="メーカー" fullWidth {...field("maker")} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mt: 2 }}>
        <TextField label="幅 (mm)" inputMode="decimal" {...field("widthMm")} />
        <TextField label="高さ (mm)" inputMode="decimal" {...field("heightMm")} />
        <TextField label="厚み (mm)" inputMode="decimal" {...field("thicknessMm")} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 2 }}>
        <TextField label="付属枚数" inputMode="numeric" {...field("count")} />
        <TextField
          label="スリーブなしの値引き額 (円)"
          inputMode="numeric"
          helperText="お客様がスリーブをお持ちの場合"
          {...field("discount")}
        />
      </Box>
      {(value.images.length > 0 || value.alternatives.length > 0) && (
        <Box sx={{ mt: 2, p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            設計ツールから登録した画像とほかの対応スリーブ（この画面では編集せず、保存してもそのまま残ります）
          </Typography>
          {value.images.length > 0 && <SleeveThumbs images={value.images} />}
          {value.alternatives.map((alt, altIndex) => (
            <Box key={`${altIndex}-${alt.name}`} sx={{ mt: 1 }}>
              <Typography variant="body2">ほかの対応スリーブ: {alt.name}{alt.maker ? `（${alt.maker}）` : ""}</Typography>
              {alt.images.length > 0 && <SleeveThumbs images={alt.images} />}
            </Box>
          ))}
          <Button
            size="small"
            color="warning"
            sx={{ mt: 1 }}
            onClick={() => onChange({ ...value, images: [], alternatives: [] })}
          >
            画像とほかの対応スリーブを外す
          </Button>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        スリーブ名を空にすると、商品ページの「対応スリーブ」欄は表示されません
      </Typography>
    </Box>
  );
}

function SleeveThumbs({ images }: { images: string[] }) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {images.map((src, index) => (
        <Box
          key={`${index}-${src}`}
          component="img"
          src={src}
          alt=""
          sx={{ width: 56, height: 56, objectFit: "contain", border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "#fff" }}
        />
      ))}
    </Box>
  );
}
