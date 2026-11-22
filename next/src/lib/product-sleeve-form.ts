import type { ProductSleeve, ProductSleeveItem } from "@/lib/types/product";

/**
 * 管理画面の「対応スリーブ」欄の入力値と、保存値（ProductSleeve）・API 送信値との変換。
 * 部品（"use client"）から切り離し、設計ツール由来の値を消さないことをテストで確かめる。
 */

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

/** テキスト欄で編集する項目（配列の images / alternatives は含まない） */
export type SleeveTextKey = {
  [K in keyof SleeveForm]: SleeveForm[K] extends string ? K : never;
}[keyof SleeveForm];

/**
 * API へ送る値。数値欄は、数値にならない入力をそのまま文字列で送る（API の検証メッセージを
 * 表示させるため）ので、スキーマの入力型より広い。
 */
export interface SleevePayload {
  name: string;
  maker: string | null;
  widthMm: number | string | null;
  heightMm: number | string | null;
  thicknessMm: number | string | null;
  count: number | string | null;
  discount: number | string | null;
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
export const numberOrNull = (value: string): number | string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
};

/** API へ送る値。名前が空なら対応スリーブの登録を消す（null） */
export const toSleevePayload = (form: SleeveForm): SleevePayload | null =>
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
