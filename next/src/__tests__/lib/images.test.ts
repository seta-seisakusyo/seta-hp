import { describe, expect, it } from "vitest";
import { isUploadedImageUrl, normalizeImageUrl } from "@/lib/images";

describe("normalizeImageUrl", () => {
  it("uploads相対パスをルート相対パスへ正規化する", () => {
    expect(normalizeImageUrl("uploads/example.png")).toBe("/uploads/example.png");
  });

  it("同一サイトの絶対URLをルート相対パスへ正規化する", () => {
    expect(normalizeImageUrl("https://kaza-love.com/uploads/example.png")).toBe(
      "/uploads/example.png"
    );
  });
});

describe("isUploadedImageUrl", () => {
  it.each([
    "/uploads/example.png",
    "uploads/example.png",
    "https://kaza-love.com/uploads/example.png",
    "https://www.kaza-love.com/uploads/example.png",
  ])("管理画面から追加された画像を判定する: %s", (value) => {
    expect(isUploadedImageUrl(value)).toBe(true);
  });

  it.each([
    "/kaza-love_logo.png",
    "https://example.com/uploads/example.png",
    "",
    null,
    undefined,
  ])("アップロード画像以外を除外する: %s", (value) => {
    expect(isUploadedImageUrl(value)).toBe(false);
  });
});
