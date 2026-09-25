import { describe, expect, it } from "vitest";
import { AMAZON_URL_MAX, ProductUpdateSchema } from "@/lib/validation";
import { getPurchaseLinks } from "@/lib/types/product";

const parseAmazonUrl = (amazonUrl: unknown) => ProductUpdateSchema.safeParse({ id: 1, amazonUrl });

describe("amazonUrl の検証", () => {
  it.each([
    "https://www.amazon.co.jp/dp/B0TEST1234",
    "https://amazon.co.jp/dp/B0TEST1234",
    "https://www.amazon.com/dp/B0TEST1234",
    "https://amzn.asia/d/abc123",
    "https://amzn.to/abc123",
  ])("Amazon のURLを受け付ける: %s", (url) => {
    const result = parseAmazonUrl(url);
    expect(result.success).toBe(true);
    expect(result.data?.amazonUrl).toBe(url);
  });

  it("コピー時の長いURL（191文字超）も上限までは受け付ける", () => {
    const url = `https://www.amazon.co.jp/${"x".repeat(300)}/dp/B0TEST1234`;
    expect(url.length).toBeGreaterThan(191);
    expect(parseAmazonUrl(url).success).toBe(true);
  });

  it.each([
    ["Amazon 以外のドメイン", "https://example.thebase.in/items/1"],
    ["ドメイン名の偽装", "https://amazon.co.jp.evil.example/dp/1"],
    ["http(s) 以外のスキーム", "javascript:alert(1)"],
    ["上限超過", `https://www.amazon.co.jp/${"x".repeat(AMAZON_URL_MAX)}`],
  ])("%s は拒否する", (_, url) => {
    expect(parseAmazonUrl(url).success).toBe(false);
  });

  it("空文字は未設定（null）として保存する", () => {
    expect(parseAmazonUrl("").data?.amazonUrl).toBeNull();
  });
});

describe("getPurchaseLinks", () => {
  it("BASE → Amazon の順で、設定済みの購入先だけを返す", () => {
    expect(getPurchaseLinks({ purchaseUrl: "https://b.example", amazonUrl: "https://a.example" }))
      .toEqual([
        { store: "BASE", href: "https://b.example" },
        { store: "Amazon", href: "https://a.example" },
      ]);
    expect(getPurchaseLinks({ purchaseUrl: null, amazonUrl: "https://a.example" }))
      .toEqual([{ store: "Amazon", href: "https://a.example" }]);
    expect(getPurchaseLinks({ purchaseUrl: null, amazonUrl: null })).toEqual([]);
  });
});
