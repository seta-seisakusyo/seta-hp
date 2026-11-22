import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_MAX, SEO_KEYWORDS_MAX, splitSeoKeywords } from "@/lib/seo-keywords";

describe("splitSeoKeywords", () => {
  it("カンマ区切りを前後の空白を除いて配列にし、空の要素は捨てる", () => {
    expect(splitSeoKeywords("カードディスプレイ, MLB ,,  , トレカ")).toEqual(["カードディスプレイ", "MLB", "トレカ"]);
  });

  it.each([null, undefined, "", " , ,"])("未設定・空は空配列: %j", (value) => {
    expect(splitSeoKeywords(value)).toEqual([]);
  });

  it("全角の読点では区切らない", () => {
    expect(splitSeoKeywords("A、B")).toEqual(["A、B"]);
  });
});

describe("SEO 項目の長さの上限", () => {
  it("DB の列長と同じ", () => {
    expect(SEO_KEYWORDS_MAX).toBe(512);
    expect(META_DESCRIPTION_MAX).toBe(320);
  });
});
