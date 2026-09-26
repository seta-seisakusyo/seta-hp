import { describe, it, expect } from "vitest";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/structured-data";
import type { Product } from "@/lib/types/product";

const baseProduct: Product = {
  id: 7,
  name: "16枚ディスプレイ",
  description: "MLBカードを美しく飾るアクリルディスプレイ。",
  price: 12800,
  category: "display",
  tags: "MLB,アクリル",
  stock: "在庫あり",
  images: ["/uploads/a.png", "/uploads/b.png"],
  isPublished: true,
  isHeroImage: false,
  purchaseUrl: null,
  amazonUrl: null,
  seoKeywords: null,
  metaDescription: null,
  designerDesignId: null,
  designerUrl: null,
  sleeve: null,
};

describe("buildProductJsonLd", () => {
  it("Product 型と基本フィールドを出力する", () => {
    const ld = buildProductJsonLd(baseProduct);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("16枚ディスプレイ");
    expect(ld.description).toBe("MLBカードを美しく飾るアクリルディスプレイ。");
    expect(ld.sku).toBe("007");
    expect(ld.brand).toEqual({ "@type": "Brand", name: "飾Love" });
  });

  it("offers に価格・通貨・在庫・URL を含む", () => {
    const ld = buildProductJsonLd(baseProduct);
    const offers = ld.offers as Record<string, unknown>;
    expect(offers.price).toBe(12800);
    expect(offers.priceCurrency).toBe("JPY");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toBe("https://kaza-love.com/products/7");
    expect(offers.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("画像を絶対URLの配列にする", () => {
    const ld = buildProductJsonLd(baseProduct);
    expect(ld.image).toEqual([
      "https://kaza-love.com/uploads/a.png",
      "https://kaza-love.com/uploads/b.png",
    ]);
  });

  it("在庫文字列を availability にマッピングする", () => {
    expect(
      (buildProductJsonLd({ ...baseProduct, stock: "残りわずか" }).offers as Record<string, unknown>)
        .availability
    ).toBe("https://schema.org/LimitedAvailability");
    expect(
      (buildProductJsonLd({ ...baseProduct, stock: "売り切れ" }).offers as Record<string, unknown>)
        .availability
    ).toBe("https://schema.org/OutOfStock");
    // 未知の在庫文字列は InStock にフォールバック
    expect(
      (buildProductJsonLd({ ...baseProduct, stock: "予約受付中" }).offers as Record<string, unknown>)
        .availability
    ).toBe("https://schema.org/InStock");
  });

  it("画像が無い場合は image キーを省く", () => {
    const ld = buildProductJsonLd({ ...baseProduct, images: null });
    expect(ld).not.toHaveProperty("image");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("ホーム > 商品一覧 > 商品名 の3階層を出力する", () => {
    const ld = buildBreadcrumbJsonLd(baseProduct);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ position: 1, name: "ホーム", item: "https://kaza-love.com" });
    expect(items[1]).toMatchObject({
      position: 2,
      name: "商品一覧",
      item: "https://kaza-love.com/products",
    });
    expect(items[2]).toMatchObject({
      position: 3,
      name: "16枚ディスプレイ",
      item: "https://kaza-love.com/products/7",
    });
  });
});
