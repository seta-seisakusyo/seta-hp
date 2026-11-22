import { describe, expect, it } from "vitest";
import {
  isCanonicalUploadUrl,
  isSafeUploadFileName,
  storedUploadedImageUrlSchema,
  uploadedImageUrlSchema,
  uploadFileNameFromUrl,
  uploadUrlFromFileName,
} from "@/lib/upload-paths";

describe("isSafeUploadFileName", () => {
  it.each(["a.png", "3fa3f74c-a457-454a-858e-27fe4f39df30.webp", "0", "a b.png"])("受け付ける: %s", (name) => {
    expect(isSafeUploadFileName(name)).toBe(true);
  });

  it.each(["", ".", "..", ".upload-sweep.json", "a/b.png", "a\\b.png", "a\0.png"])("拒否する: %j", (name) => {
    expect(isSafeUploadFileName(name)).toBe(false);
  });
});

describe("uploadFileNameFromUrl", () => {
  it.each([
    ["/uploads/a.png", "a.png"],
    ["/uploads/00000000-0000-0000-0000-000000000000.png", "00000000-0000-0000-0000-000000000000.png"],
    ["uploads/a.png", "a.png"],
    ["https://kaza-love.com/uploads/a.png?v=1#x", "a.png"],
    ["https://www.setaseisakusyo.com/uploads/a.png", "a.png"],
    ["/uploads/a%20b.png", "a b.png"],
    ["/uploads/a%2520b.png", "a%20b.png"],
  ])("%s → %s", (url, name) => {
    expect(uploadFileNameFromUrl(url)).toBe(name);
  });

  it.each([
    null,
    "",
    "https://evil.example/uploads/a.png",
    "//evil.example/uploads/a.png",
    "/images/a.png",
    "/uploads/",
    "/uploads/sub/a.png",
    "/uploads/%2fa.png",
    "/uploads/%5ca.png",
    "/uploads/%00.png",
    "/uploads/a\0.png",
    "/uploads/../secret",
    "/uploads/%2e%2e",
    "/uploads/.upload-sweep.json",
    "/uploads/%E0%A4%A.png",
  ])("アップロード画像として扱わない: %j", (url) => {
    expect(uploadFileNameFromUrl(url)).toBeNull();
  });
});

describe("uploadUrlFromFileName / isCanonicalUploadUrl", () => {
  it("ファイル名から URL を作り、元のファイル名に戻せる", () => {
    for (const name of ["a.png", "a b.png", "a#b.png", "a%b.png"]) {
      const url = uploadUrlFromFileName(name);
      expect(isCanonicalUploadUrl(url)).toBe(true);
      expect(uploadFileNameFromUrl(url)).toBe(name);
    }
  });

  it.each(["/uploads/a.png?v=1", "/uploads/a.png#x", "https://kaza-love.com/uploads/a.png", "uploads/a.png"])(
    "正規形でないものは false: %s",
    (url) => expect(isCanonicalUploadUrl(url)).toBe(false),
  );
});

describe("uploadedImageUrlSchema（値を変えない厳密版）", () => {
  it("/uploads/<ファイル名> だけを受け付ける", () => {
    expect(uploadedImageUrlSchema.parse("/uploads/x.webp")).toBe("/uploads/x.webp");
    expect(uploadedImageUrlSchema.safeParse("https://kaza-love.com/uploads/x.webp").success).toBe(false);
    expect(uploadedImageUrlSchema.safeParse("/uploads/x.webp?v=1").success).toBe(false);
    expect(uploadedImageUrlSchema.safeParse(`/uploads/${"a".repeat(200)}.png`).success).toBe(false);
  });
});

describe("storedUploadedImageUrlSchema（保存用・過去データを正規化）", () => {
  it.each([
    ["/uploads/x.webp", "/uploads/x.webp"],
    ["uploads/x.webp", "/uploads/x.webp"],
    ["https://kaza-love.com/uploads/x.webp", "/uploads/x.webp"],
    ["https://setaseisakusyo.com/uploads/x.webp?version=1", "/uploads/x.webp"],
    [" /uploads/x.webp ", "/uploads/x.webp"],
  ])("%s → %s", (input, output) => {
    expect(storedUploadedImageUrlSchema.parse(input)).toBe(output);
  });

  it.each([
    "https://evil.example/x.png",
    "https://evil.example/uploads/x.png",
    "javascript:alert(1)",
    "/kaza-love_logo.png",
    "/uploads/../x.png",
    "",
  ])("拒否する: %s", (input) => {
    expect(storedUploadedImageUrlSchema.safeParse(input).success).toBe(false);
  });
});
