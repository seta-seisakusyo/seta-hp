import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  hasPendingSleeveImageRefs,
  resolveSleeveImageRefs,
  SleeveImageRefError,
  sleeveImageRefIndexes,
  toSleeveData,
} from "@/lib/product-sleeve";
import { collectSleeveImageUrls, parseProductSleeve } from "@/lib/types/product";
import { collectImageUrls } from "@/lib/uploaded-files";

describe("parseProductSleeve", () => {
  it("保存済みの対応スリーブを読み取る(画像・複数対応より前の形も)", () => {
    expect(parseProductSleeve({
      name: "フルプロテクトスリーブ", maker: "河島製作所",
      widthMm: 71, heightMm: 96, thicknessMm: 3, count: 8, discount: 880,
    })).toEqual({
      name: "フルプロテクトスリーブ", maker: "河島製作所",
      widthMm: 71, heightMm: 96, thicknessMm: 3, count: 8, discount: 880,
      images: [], alternatives: [],
    });
  });

  it("画像とほかの対応スリーブを読み取る", () => {
    const sleeve = parseProductSleeve({
      name: "代表", images: ["/uploads/a.webp"],
      alternatives: [
        { name: "KMC", maker: "KMC", widthMm: 66, heightMm: 92, images: ["/uploads/k.png"] },
        { name: "" },
        "junk",
      ],
    });
    expect(sleeve?.images).toEqual(["/uploads/a.webp"]);
    expect(sleeve?.alternatives).toEqual([
      { name: "KMC", maker: "KMC", widthMm: 66, heightMm: 92, thicknessMm: null, images: ["/uploads/k.png"] },
    ]);
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
      images: [], alternatives: [],
    });
  });
});

describe("toSleeveData", () => {
  it("未送信は変更しない・null は登録を消す・値は任意項目を null / 空配列で揃える", () => {
    expect(toSleeveData(undefined)).toBeUndefined();
    expect(toSleeveData(null)).toBe(Prisma.JsonNull);
    expect(toSleeveData({ name: "S" })).toEqual({
      name: "S", maker: null, widthMm: null, heightMm: null, thicknessMm: null, count: null, discount: null,
      images: [], alternatives: [],
    });
  });
});

describe("toSleeveData(保存済みの値を残す)", () => {
  const existing = {
    name: "旧", images: ["/uploads/a.webp"],
    alternatives: [{ name: "KMC", images: ["/uploads/k.webp"] }],
  };

  it("images / alternatives を送っていなければ保存済みの値を残す(古い画面からの保存で消さない)", () => {
    expect(toSleeveData({ name: "新" }, existing)).toMatchObject({
      name: "新",
      images: ["/uploads/a.webp"],
      alternatives: [{ name: "KMC", maker: null, widthMm: null, heightMm: null, thicknessMm: null, images: ["/uploads/k.webp"] }],
    });
  });

  it("空配列・null を送れば外す", () => {
    expect(toSleeveData({ name: "新", images: [], alternatives: null }, existing)).toMatchObject({ images: [], alternatives: [] });
  });
});

describe("スリーブ画像の参照", () => {
  const sleeve = {
    name: "代表",
    images: ["file:0", "/uploads/keep.png"],
    alternatives: [{ name: "KMC", images: ["file:1", "file:0"] }],
  };

  it("file:番号 を保存した画像の URL に置き換える", () => {
    expect(sleeveImageRefIndexes(sleeve)).toEqual([0, 1]);
    expect(hasPendingSleeveImageRefs(sleeve)).toBe(true);
    const resolved = resolveSleeveImageRefs(sleeve, ["/uploads/new0.jpg", "/uploads/new1.jpg"]);
    expect(resolved.images).toEqual(["/uploads/new0.jpg", "/uploads/keep.png"]);
    expect(resolved.alternatives?.[0].images).toEqual(["/uploads/new1.jpg", "/uploads/new0.jpg"]);
    expect(hasPendingSleeveImageRefs(resolved)).toBe(false);
  });

  it("送られていない番号を指したら例外", () => {
    expect(() => resolveSleeveImageRefs(sleeve, ["/uploads/only0.jpg"])).toThrow(SleeveImageRefError);
  });

  it("スリーブの画像も参照中の画像として数える(自動削除で消さない)", () => {
    const stored = { name: "代表", images: ["/uploads/a.webp"], alternatives: [{ name: "B", images: ["/uploads/b.webp"] }] };
    expect(collectSleeveImageUrls(stored)).toEqual(["/uploads/a.webp", "/uploads/b.webp"]);
    expect(collectImageUrls({ images: ["/uploads/p.webp"], sleeve: stored }).sort())
      .toEqual(["/uploads/a.webp", "/uploads/b.webp", "/uploads/p.webp"]);
  });
});
