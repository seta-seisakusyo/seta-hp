import { Prisma } from "@prisma/client";
import type { ProductSleeveInput } from "@/lib/validation";

/**
 * 検証済みの対応スリーブ入力を Product.sleeve へ書く値にする。
 * - undefined: 変更しない（部分更新で未送信）
 * - null: 登録を消す
 * - 値: 未入力の任意項目は null に揃えて保存する
 */
export function toSleeveData(
  sleeve: ProductSleeveInput | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (sleeve === undefined) return undefined;
  if (sleeve === null) return Prisma.JsonNull;
  return {
    name: sleeve.name,
    maker: sleeve.maker ?? null,
    widthMm: sleeve.widthMm ?? null,
    heightMm: sleeve.heightMm ?? null,
    thicknessMm: sleeve.thicknessMm ?? null,
    count: sleeve.count ?? null,
    discount: sleeve.discount ?? null,
  };
}
