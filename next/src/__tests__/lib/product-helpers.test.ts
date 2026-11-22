import { describe, expect, it } from "vitest";
import {
  getPrimaryProductImage,
  getProductInquiryHref,
  parseProductImages,
  parseTags,
} from "@/lib/types/product";

describe("parseTags", () => {
  it("カンマ区切りを前後の空白を除いて配列にし、空の要素は捨てる", () => {
    expect(parseTags(" MLB , トレカ,, ,大谷 ")).toEqual(["MLB", "トレカ", "大谷"]);
  });

  it.each([null, undefined, ""])("未設定・空は空配列: %j", (value) => {
    expect(parseTags(value)).toEqual([]);
  });
});

describe("parseProductImages", () => {
  it("同じサイトの絶対 URL や uploads/ を相対パスにそろえ、空の要素は捨てる", () => {
    expect(parseProductImages([
      "/uploads/a.png",
      "uploads/b.png",
      "https://kaza-love.com/uploads/c.png?v=1",
      "  ",
      "https://cdn.example.com/d.png",
    ])).toEqual(["/uploads/a.png", "/uploads/b.png", "/uploads/c.png?v=1", "https://cdn.example.com/d.png"]);
  });

  it.each([null, undefined, "/uploads/a.png", { 0: "/uploads/a.png" }, ["/uploads/a.png", 1], [null]])(
    "文字列の配列でなければ空配列: %j",
    (value) => {
      expect(parseProductImages(value)).toEqual([]);
    }
  );
});

describe("getPrimaryProductImage", () => {
  it("先頭の画像を代表にする", () => {
    expect(getPrimaryProductImage(["uploads/first.png", "/uploads/second.png"])).toBe("/uploads/first.png");
  });

  it("空白だけの先頭は飛ばして、次の有効な画像を代表にする", () => {
    expect(getPrimaryProductImage(["", "/uploads/second.png"])).toBe("/uploads/second.png");
  });

  it.each([[], null, "x", [1]])("画像がなければ null: %j", (value) => {
    expect(getPrimaryProductImage(value)).toBeNull();
  });
});

describe("getProductInquiryHref", () => {
  it("商品名をクエリに入れてお問い合わせへ誘導する", () => {
    expect(getProductInquiryHref("カードディスプレイ")).toBe(
      `/contact?product=${encodeURIComponent("カードディスプレイ")}`
    );
  });

  it("& や # を含む商品名でもクエリが壊れない", () => {
    const href = getProductInquiryHref("A&B #1 ?x=y");
    expect(new URL(href, "http://localhost").searchParams.get("product")).toBe("A&B #1 ?x=y");
    expect(new URL(href, "http://localhost").hash).toBe("");
  });
});
