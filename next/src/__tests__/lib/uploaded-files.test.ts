import type { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUnusedUploadedFiles } from "@/lib/uploaded-files";

vi.mock("fs/promises", () => ({ unlink: vi.fn() }));

const products = vi.fn();
const works = vi.fn();
const prisma = {
  product: { findMany: products },
  work: { findMany: works },
} as unknown as PrismaClient;
const uploadPath = (name: string) => path.resolve("public", "uploads", name);

beforeEach(() => {
  vi.clearAllMocks();
  products.mockResolvedValue([]);
  works.mockResolvedValue([]);
  vi.mocked(unlink).mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("deleteUnusedUploadedFiles", () => {
  it("商品と制作事例に残る参照を、旧ドメイン・相対URLも含めて保護する", async () => {
    products.mockResolvedValue([{ images: ["https://setaseisakusyo.com/uploads/shared.png?version=1"] }]);
    works.mockResolvedValue([{ image: "uploads/work.png" }]);

    await deleteUnusedUploadedFiles(prisma, [
      "/uploads/shared.png", "/uploads/work.png", "/uploads/unused.png",
      "https://kaza-love.com/uploads/unused.png#preview",
    ]);

    expect(unlink).toHaveBeenCalledTimes(1);
    expect(unlink).toHaveBeenCalledWith(uploadPath("unused.png"));
  });

  it.each([
    "https://example.com/uploads/local.png",
    "//example.com/uploads/local.png",
    "ftp://kaza-love.com/uploads/local.png",
    "/uploads/%E0%A4%A.png",
    "/uploads/%00.png",
    "/uploads/sub/image.png",
    "/uploads/%2fimage.png",
    "/uploads/%5cimage.png",
    "/uploads/../secret.txt",
    "/uploads/%2e%2e/secret.txt",
    "/kaza-love_logo.png",
  ])("不正またはローカル外のURLはDB照会も削除もしない: %s", async (url) => {
    await expect(deleteUnusedUploadedFiles(prisma, [url])).resolves.toBeUndefined();
    expect(products).not.toHaveBeenCalled();
    expect(works).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });

  it("外部URLの同名ファイルは、ローカル画像の参照には含めない", async () => {
    products.mockResolvedValue([{ images: ["https://example.com/uploads/local.png"] }]);
    await deleteUnusedUploadedFiles(prisma, ["/uploads/local.png"]);
    expect(unlink).toHaveBeenCalledWith(uploadPath("local.png"));
  });

  it("エンコード済みファイル名を二重デコードせず、対象ファイルだけ削除する", async () => {
    await deleteUnusedUploadedFiles(prisma, ["/uploads/a%2520b.png", "/uploads/a%23b.png"]);
    expect(unlink).toHaveBeenCalledWith(uploadPath("a%20b.png"));
    expect(unlink).toHaveBeenCalledWith(uploadPath("a#b.png"));
    expect(unlink).toHaveBeenCalledTimes(2);
  });

  it("参照確認が失敗したらファイルを残し、保存後の処理を失敗させない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    products.mockRejectedValue(new Error("database unavailable"));
    await expect(deleteUnusedUploadedFiles(prisma, ["/uploads/local.png"])).resolves.toBeUndefined();
    expect(unlink).not.toHaveBeenCalled();
  });

  it("既にないファイルは無視し、別ファイルの削除は続行する", async () => {
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "ENOENT" }));
    await expect(deleteUnusedUploadedFiles(prisma, ["/uploads/missing.png", "/uploads/old.png"])).resolves.toBeUndefined();
    expect(unlink).toHaveBeenCalledWith(uploadPath("old.png"));
  });
});
