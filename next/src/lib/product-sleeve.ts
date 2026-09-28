import { Prisma } from "@prisma/client";
import { parseProductSleeve } from "@/lib/types/product";
import type { ProductSleeveInput, ProductSleeveItemInput } from "@/lib/validation";

const FILE_REF = /^file:(\d+)$/;

function itemData(item: ProductSleeveItemInput) {
  return {
    name: item.name,
    maker: item.maker ?? null,
    widthMm: item.widthMm ?? null,
    heightMm: item.heightMm ?? null,
    thicknessMm: item.thicknessMm ?? null,
    images: item.images ?? [],
  };
}

/**
 * 検証済みの対応スリーブ入力を Product.sleeve へ書く値にする。
 * - undefined: 変更しない（部分更新で未送信）
 * - null: 登録を消す
 * - 値: 未入力の任意項目は null / 空配列に揃えて保存する
 *
 * 代表の images と alternatives は、項目ごと送られていなければ保存済みの値（existing）を残す。
 * 画像・複数対応より前の画面や設計ツールから保存しても、登録済みの画像を消さないため。
 * 明示的に null / [] を送れば外す。
 */
export function toSleeveData(
  sleeve: ProductSleeveInput | null | undefined,
  existing?: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (sleeve === undefined) return undefined;
  if (sleeve === null) return Prisma.JsonNull;
  const kept = parseProductSleeve(existing);
  return {
    ...itemData(sleeve),
    images: sleeve.images !== undefined ? (sleeve.images ?? []) : (kept?.images ?? []),
    count: sleeve.count ?? null,
    discount: sleeve.discount ?? null,
    alternatives: sleeve.alternatives !== undefined
      ? (sleeve.alternatives ?? []).map(itemData)
      : (kept?.alternatives ?? []),
  };
}

function allImages(sleeve: ProductSleeveInput): string[] {
  return [...(sleeve.images ?? []), ...(sleeve.alternatives ?? []).flatMap((alt) => alt.images ?? [])];
}

/** まだ保存されていない画像の参照（"file:番号"）を含むか。管理画面からの保存では受け付けない。 */
export function hasPendingSleeveImageRefs(sleeve: ProductSleeveInput | null | undefined): boolean {
  return !!sleeve && allImages(sleeve).some((image) => FILE_REF.test(image));
}

/** 参照している "file:番号" の番号（重複なし）。 */
export function sleeveImageRefIndexes(sleeve: ProductSleeveInput | null | undefined): number[] {
  if (!sleeve) return [];
  const indexes = allImages(sleeve)
    .map((image) => FILE_REF.exec(image))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]));
  return [...new Set(indexes)];
}

/**
 * "file:番号" を、同じリクエストで保存した画像の URL に置き換える。
 * urls[番号] が無い参照があれば例外（送られた画像と合わない）。
 */
export function resolveSleeveImageRefs(sleeve: ProductSleeveInput, urls: string[]): ProductSleeveInput {
  const resolve = (images: string[] | null | undefined) =>
    (images ?? []).map((image) => {
      const match = FILE_REF.exec(image);
      if (!match) return image;
      const url = urls[Number(match[1])];
      if (!url) throw new SleeveImageRefError(`スリーブの画像 ${image} が送られていません`);
      return url;
    });
  return {
    ...sleeve,
    images: resolve(sleeve.images),
    alternatives: (sleeve.alternatives ?? []).map((alt) => ({ ...alt, images: resolve(alt.images) })),
  };
}

export class SleeveImageRefError extends Error {}
