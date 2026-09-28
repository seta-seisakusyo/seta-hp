"use client";

import { Box, Button, TextField, Typography } from "@mui/material";
import type { ProductSleeve, ProductSleeveItem } from "@/lib/types/product";

/** 対応スリーブの入力値（テキスト欄のため文字列で持つ） */
export interface SleeveForm {
  name: string;
  maker: string;
  widthMm: string;
  heightMm: string;
  thicknessMm: string;
  count: string;
  discount: string;
  /**
   * 設計ツールから登録した画像とほかの対応スリーブ。この画面では編集せず、保存時にそのまま送る
   * (管理画面で保存しても消えないように)。
   */
  images: string[];
  alternatives: ProductSleeveItem[];
}

export const emptySleeveForm = (): SleeveForm => ({
  name: "",
  maker: "",
  widthMm: "",
  heightMm: "",
  thicknessMm: "",
  count: "",
  discount: "",
  images: [],
  alternatives: [],
});

const text = (value: number | string | null) => (value === null ? "" : String(value));

export const toSleeveForm = (sleeve: ProductSleeve | null): SleeveForm =>
  sleeve
    ? {
        name: sleeve.name,
        maker: text(sleeve.maker),
        widthMm: text(sleeve.widthMm),
        heightMm: text(sleeve.heightMm),
        thicknessMm: text(sleeve.thicknessMm),
        count: text(sleeve.count),
        discount: text(sleeve.discount),
        images: sleeve.images,
        alternatives: sleeve.alternatives,
      }
    : emptySleeveForm();

// 空欄は未設定（null）。数値にならない入力はそのまま送り、API の検証メッセージを表示させる
// （JSON 化すると NaN が null に化けて、誤入力が黙って消えるのを避ける）。
const numberOrNull = (value: string): number | string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
};

/** API へ送る値。名前が空なら対応スリーブの登録を消す（null） */
export const toSleevePayload = (form: SleeveForm) =>
  form.name.trim()
    ? {
        name: form.name.trim(),
        maker: form.maker.trim() || null,
        widthMm: numberOrNull(form.widthMm),
        heightMm: numberOrNull(form.heightMm),
        thicknessMm: numberOrNull(form.thicknessMm),
        count: numberOrNull(form.count),
        discount: numberOrNull(form.discount),
        images: form.images,
        alternatives: form.alternatives,
      }
    : null;

interface Props {
  value: SleeveForm;
  onChange: (value: SleeveForm) => void;
}

/** 商品編集の「対応スリーブ」欄。設計ツールから登録した商品は設計のスリーブが入る */
export default function ProductSleeveFields({ value, onChange }: Props) {
  const field = (key: keyof SleeveForm) => ({
    value: value[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: e.target.value }),
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
