import { describe, expect, it } from "vitest";
import { canOpenWork, findWorkById, hasWorkParam, workCardId } from "@/app/gallery/_components/work-gallery";
import { getProductInquiryHref, getWorkInquiryHref } from "@/lib/types/product";
import type { WorkGridItem } from "@/lib/types/work";

const work = (id: number, image: string | null): WorkGridItem => ({
  id,
  title: `作品${id}`,
  category: "wall",
  image,
  products: [],
});

describe("getWorkInquiryHref", () => {
  it("作品タイトルを display パラメータで引き継ぐ（従来のインライン組み立てと同じURL）", () => {
    const title = "MLB カード 9枚 & 額 / #1?";
    expect(getWorkInquiryHref(title)).toBe(`/contact?display=${encodeURIComponent(title)}`);
    expect(getWorkInquiryHref(title)).toBe(
      "/contact?display=MLB%20%E3%82%AB%E3%83%BC%E3%83%89%209%E6%9E%9A%20%26%20%E9%A1%8D%20%2F%20%231%3F"
    );
  });

  it("ContactForm が読む display パラメータとして元のタイトルに戻る", () => {
    const title = "作品 & 100% 「飾る」";
    const url = new URL(getWorkInquiryHref(title), "https://example.com");
    expect(url.pathname).toBe("/contact");
    expect(url.searchParams.get("display")).toBe(title);
    expect(url.searchParams.get("product")).toBeNull();
  });

  it("商品用（product）とはパラメータ名だけが異なる", () => {
    expect(getWorkInquiryHref("A")).toBe("/contact?display=A");
    expect(getProductInquiryHref("A")).toBe("/contact?product=A");
  });
});

describe("findWorkById", () => {
  const works = [work(1, "/uploads/a.jpg"), work(2, null)];

  it("一致する作品を一覧の要素そのもの（同じ参照）で返す", () => {
    expect(findWorkById(works, 2)).toBe(works[1]);
  });

  it("指定なし・存在しないIDは null", () => {
    expect(findWorkById(works, null)).toBeNull();
    expect(findWorkById(works, 999)).toBeNull();
    expect(findWorkById([], 1)).toBeNull();
  });
});

describe("canOpenWork", () => {
  it("画像がある作品だけ拡大表示を開ける", () => {
    expect(canOpenWork({ image: "/uploads/a.jpg" })).toBe(true);
    expect(canOpenWork({ image: null })).toBe(false);
    expect(canOpenWork({ image: "" })).toBe(false);
  });
});

describe("hasWorkParam", () => {
  it.each([
    ["?work=3", true],
    ["?foo=1&work=", true],
    ["?work", true],
    ["", false],
    ["?works=3", false],
    ["?foo=work", false],
  ])("%s → %s", (search, expected) => {
    expect(hasWorkParam(search)).toBe(expected);
  });
});

describe("workCardId", () => {
  it("カードの要素IDを作る", () => {
    expect(workCardId(12)).toBe("work-12");
  });
});
