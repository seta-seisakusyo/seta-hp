import { describe, expect, it } from "vitest";
import {
  emptySleeveForm,
  numberOrNull,
  toSleeveForm,
  toSleevePayload,
  type SleeveForm,
} from "@/lib/product-sleeve-form";
import { parseProductSleeve, type ProductSleeve } from "@/lib/types/product";
import { productSleeveSchema } from "@/lib/validation";

const designerSleeve: ProductSleeve = {
  name: "フルプロテクトスリーブ",
  maker: "メーカーA",
  widthMm: 66.5,
  heightMm: 92,
  thicknessMm: 0.1,
  count: 2,
  discount: 300,
  images: ["/uploads/sleeve-main.webp", "/uploads/sleeve-back.webp"],
  alternatives: [
    {
      name: "スモールスリーブ",
      maker: null,
      widthMm: 64,
      heightMm: 89,
      thicknessMm: null,
      images: ["/uploads/alt.webp"],
    },
  ],
};

describe("toSleeveForm", () => {
  it("未登録なら空のフォームにする", () => {
    expect(toSleeveForm(null)).toEqual(emptySleeveForm());
  });

  it("数値は文字列に、null は空欄にする", () => {
    const form = toSleeveForm({ ...designerSleeve, maker: null, thicknessMm: null, count: null });
    expect(form).toMatchObject({
      maker: "",
      widthMm: "66.5",
      heightMm: "92",
      thicknessMm: "",
      count: "",
      discount: "300",
    });
  });
});

describe("toSleevePayload", () => {
  it("名前が空（空白のみを含む）なら登録を消す null を送る", () => {
    expect(toSleevePayload(emptySleeveForm())).toBeNull();
    expect(toSleevePayload({ ...toSleeveForm(designerSleeve), name: "   " })).toBeNull();
  });

  it("空欄の数値・メーカーは null、前後の空白は除いて送る", () => {
    const form: SleeveForm = {
      ...emptySleeveForm(),
      name: "  スリーブ  ",
      maker: "  ",
      widthMm: " 66 ",
      heightMm: "",
      thicknessMm: "   ",
      count: "1",
      discount: "0",
    };
    expect(toSleevePayload(form)).toEqual({
      name: "スリーブ",
      maker: null,
      widthMm: 66,
      heightMm: null,
      thicknessMm: null,
      count: 1,
      discount: 0,
      images: [],
      alternatives: [],
    });
  });

  it("数値にならない入力は文字列のまま送り、API の検証で弾かせる", () => {
    expect(numberOrNull("abc")).toBe("abc");
    const payload = toSleevePayload({ ...emptySleeveForm(), name: "スリーブ", widthMm: "6x" });
    expect(payload?.widthMm).toBe("6x");
    expect(productSleeveSchema.safeParse(payload).success).toBe(false);
  });

  it("管理画面で文字欄を編集しても、設計ツール由来の画像とほかの対応スリーブを残す", () => {
    const form = toSleeveForm(designerSleeve);
    const edited: SleeveForm = { ...form, name: "名前を変更", discount: "500" };
    const payload = toSleevePayload(edited);
    expect(payload?.images).toEqual(designerSleeve.images);
    expect(payload?.alternatives).toEqual(designerSleeve.alternatives);
    expect(payload).toMatchObject({ name: "名前を変更", discount: 500 });
  });
});

describe("往復", () => {
  it("保存値 → フォーム → 送信値 → 保存値で内容が変わらない", () => {
    const payload = toSleevePayload(toSleeveForm(designerSleeve));
    expect(payload).toEqual(designerSleeve);
    expect(parseProductSleeve(payload)).toEqual(designerSleeve);
  });

  it("送信値は API のスキーマを通る", () => {
    const payload = toSleevePayload(toSleeveForm(designerSleeve));
    expect(productSleeveSchema.safeParse(payload).success).toBe(true);
  });
});
