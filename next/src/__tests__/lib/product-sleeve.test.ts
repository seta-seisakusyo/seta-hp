import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toSleeveData } from "@/lib/product-sleeve";
import { parseProductSleeve } from "@/lib/types/product";

describe("parseProductSleeve", () => {
  it("保存済みの対応スリーブを読み取る", () => {
    expect(parseProductSleeve({
      name: "フルプロテクトスリーブ", maker: "河島製作所",
      widthMm: 71, heightMm: 96, thicknessMm: 3, count: 8, discount: 880,
    })).toEqual({
      name: "フルプロテクトスリーブ", maker: "河島製作所",
      widthMm: 71, heightMm: 96, thicknessMm: 3, count: 8, discount: 880,
    });
  });

  it("名前がない・JSONの形が違うものは未登録として扱う", () => {
    expect(parseProductSleeve(null)).toBeNull();
    expect(parseProductSleeve([])).toBeNull();
    expect(parseProductSleeve({ name: "" })).toBeNull();
    expect(parseProductSleeve("フルプロテクト")).toBeNull();
  });

  it("型の合わない項目は null にして表示に出さない", () => {
    expect(parseProductSleeve({ name: "S", widthMm: "71", count: null, maker: 1 })).toEqual({
      name: "S", maker: null, widthMm: null, heightMm: null, thicknessMm: null, count: null, discount: null,
    });
  });
});

describe("toSleeveData", () => {
  it("未送信は変更しない・null は登録を消す・値は任意項目を null で揃える", () => {
    expect(toSleeveData(undefined)).toBeUndefined();
    expect(toSleeveData(null)).toBe(Prisma.JsonNull);
    expect(toSleeveData({ name: "S" })).toEqual({
      name: "S", maker: null, widthMm: null, heightMm: null, thicknessMm: null, count: null, discount: null,
    });
  });
});
