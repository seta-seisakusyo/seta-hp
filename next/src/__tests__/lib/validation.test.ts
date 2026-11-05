import { describe, it, expect } from "vitest";
import {
  InquirySchema,
  RegistrationSchema,
  NewsCreateSchema,
  NewsUpdateSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  RequiredIdSchema,
  WorkCreateSchema,
  validateInquiry,
} from "@/lib/validation";

describe("InquirySchema", () => {
  const validData = {
    name: "山田太郎",
    email: "yamada@example.com",
    inquiry: "テストのお問い合わせ内容です。",
  };

  it("有効なデータでバリデーション成功", () => {
    expect(InquirySchema.safeParse(validData).success).toBe(true);
  });

  it("氏名が空のとき失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
  });

  it("氏名が50文字超で失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, name: "あ".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("メールアドレスが不正な形式で失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("問い合わせ内容が空のとき失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, inquiry: "" });
    expect(result.success).toBe(false);
  });

  it("問い合わせ内容が500文字超で失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, inquiry: "あ".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("電話番号が有効な形式で成功", () => {
    const patterns = ["03-1234-5678", "090-1234-5678", "0120-123-456", "0761234567", ""];
    for (const phone of patterns) {
      const result = InquirySchema.safeParse({ ...validData, phone });
      expect(result.success).toBe(true);
    }
  });

  it("電話番号が無効な形式で失敗", () => {
    const result = InquirySchema.safeParse({ ...validData, phone: "abc-defg" });
    expect(result.success).toBe(false);
  });

});

describe("validateInquiry", () => {
  it("有効なデータで空オブジェクトを返す", () => {
    const errors = validateInquiry({
      name: "山田太郎",
      email: "yamada@example.com",
      inquiry: "テスト",
    });
    expect(errors).toEqual({});
  });

  it("複数フィールドのエラーをまとめて返す", () => {
    const errors = validateInquiry({
      name: "",
      email: "invalid",
      inquiry: "",
    });
    expect(errors).toHaveProperty("name");
    expect(errors).toHaveProperty("email");
    expect(errors).toHaveProperty("inquiry");
  });
});

describe("RegistrationSchema", () => {
  const validData = {
    name: "テストユーザー",
    email: "test@example.com",
    password: "Abc12345",
  };

  it("有効なデータでバリデーション成功", () => {
    expect(RegistrationSchema.safeParse(validData).success).toBe(true);
  });

  it("パスワードが8文字未満で失敗", () => {
    const result = RegistrationSchema.safeParse({ ...validData, password: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("パスワードに大文字がなくて失敗", () => {
    const result = RegistrationSchema.safeParse({ ...validData, password: "abc12345" });
    expect(result.success).toBe(false);
  });

  it("パスワードに小文字がなくて失敗", () => {
    const result = RegistrationSchema.safeParse({ ...validData, password: "ABC12345" });
    expect(result.success).toBe(false);
  });

  it("パスワードに数字がなくて失敗", () => {
    const result = RegistrationSchema.safeParse({ ...validData, password: "Abcdefgh" });
    expect(result.success).toBe(false);
  });
});

describe("管理APIスキーマ", () => {
  const product = {
    name: "8枚モデル",
    description: "商品説明",
    price: 12000,
    category: "card-display",
    tags: ["MLB", "Topps"],
    images: ["/uploads/main.webp", "/uploads/sub.webp"],
    stock: "在庫あり",
    isPublished: true,
    isHeroImage: false,
    purchaseUrl: "https://example.com/item/1",
  };

  it("商品作成の全入力項目を検証して保持する", () => {
    const result = ProductCreateSchema.safeParse(product);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.images).toEqual(product.images);
  });

  it("商品公開フラグの文字列を拒否する", () => {
    expect(ProductCreateSchema.safeParse({ ...product, isPublished: "true" }).success).toBe(false);
  });

  it("購入URLに http(s) 以外のスキーム（javascript:）を拒否する", () => {
    expect(
      ProductCreateSchema.safeParse({ ...product, purchaseUrl: "javascript:alert(1)" }).success
    ).toBe(false);
    expect(
      ProductCreateSchema.safeParse({ ...product, purchaseUrl: "http://example.com" }).success
    ).toBe(true);
  });

  it("商品名がVARCHAR上限(191)を超える場合は拒否する", () => {
    expect(
      ProductCreateSchema.safeParse({ ...product, name: "あ".repeat(192) }).success
    ).toBe(false);
  });

  it("商品更新はID必須で部分更新を許可する", () => {
    expect(ProductUpdateSchema.safeParse({ id: 1, isHeroImage: true }).success).toBe(true);
    expect(ProductUpdateSchema.safeParse({ isHeroImage: true }).success).toBe(false);
  });

  it("制作事例の画像・タグ・公開状態を検証する", () => {
    const result = WorkCreateSchema.safeParse({
      title: "壁面展示",
      description: "制作事例",
      category: "laser",
      tags: "MLB,大型",
      image: "/uploads/work.webp",
      isPublished: false,
    });
    expect(result.success).toBe(true);
  });

  it("削除IDは正の整数だけを許可する", () => {
    expect(RequiredIdSchema.safeParse({ id: 1 }).success).toBe(true);
    expect(RequiredIdSchema.safeParse({ id: 0 }).success).toBe(false);
    expect(RequiredIdSchema.safeParse({ id: "1" }).success).toBe(false);
  });

  it("お知らせ日付をDateへ変換し、不正な日付を拒否する", () => {
    const valid = NewsCreateSchema.safeParse({
      title: "公開日",
      contents: { text: "本文" },
      date: "2026-08-07",
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.date).toBeInstanceOf(Date);

    const invalid = NewsCreateSchema.safeParse({
      title: "公開日",
      contents: { text: "本文" },
      date: "not-a-date",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0].message).toBe("日付の形式が正しくありません");
    }
  });

  it("お知らせobject形式の空本文を拒否する", () => {
    const result = NewsCreateSchema.safeParse({
      title: "公開日",
      contents: { text: "" },
      date: "2026-08-07",
    });
    expect(result.success).toBe(false);
  });

  it("お知らせの必須項目不足は従来の共通メッセージを返す", () => {
    const result = NewsCreateSchema.safeParse({ title: "公開日", date: "2026-08-07" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("タイトル、内容、日付は必須です");
    }
  });

  it("お知らせ更新は正の整数IDを必須にする", () => {
    expect(NewsUpdateSchema.safeParse({ id: 1, title: "更新" }).success).toBe(true);
    expect(NewsUpdateSchema.safeParse({ title: "更新" }).success).toBe(false);
    expect(NewsUpdateSchema.safeParse({ id: 0, title: "更新" }).success).toBe(false);
  });
});
