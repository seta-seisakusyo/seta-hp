import type { PrismaClient } from "@prisma/client";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUnusedUploadedFiles } from "@/lib/uploaded-files";

const products = vi.fn();
const works = vi.fn();
const prisma = {
  product: { findMany: products },
  work: { findMany: works },
} as unknown as PrismaClient;

// 保存先は一時ディレクトリ。実ファイルを置き、消えたかどうかで確かめる（#406）。
let root: string;
let uploadDir: string;
const addFiles = (...names: string[]) =>
  Promise.all(names.map((name) => writeFile(path.join(uploadDir, name), "x")));
const remaining = async () => (await readdir(uploadDir)).sort();
const cleanup = (urls: string[]) => deleteUnusedUploadedFiles(prisma, urls, { uploadDir });

beforeEach(async () => {
  vi.clearAllMocks();
  products.mockResolvedValue([]);
  works.mockResolvedValue([]);
  root = await mkdtemp(path.join(tmpdir(), "uploaded-files-"));
  uploadDir = path.join(root, "uploads");
  await mkdir(uploadDir);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("deleteUnusedUploadedFiles", () => {
  it("商品と制作事例に残る参照を、旧ドメイン・相対URLも含めて保護する", async () => {
    products.mockResolvedValue([{ images: ["https://setaseisakusyo.com/uploads/shared.png?version=1"] }]);
    works.mockResolvedValue([{ image: "uploads/work.png" }]);
    await addFiles("shared.png", "work.png", "unused.png");

    await cleanup([
      "/uploads/shared.png", "/uploads/work.png", "/uploads/unused.png",
      "https://kaza-love.com/uploads/unused.png#preview",
    ]);

    expect(await remaining()).toEqual(["shared.png", "work.png"]);
  });

  it("UUID のファイル名（数字の 0 を含む）を消す", async () => {
    const name = "3fa3f74c-a457-454a-858e-27fe4f39df30.webp";
    await addFiles(name);
    await cleanup([`/uploads/${name}`]);
    expect(await remaining()).toEqual([]);
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
    "/uploads/.upload-sweep.json",
    "/kaza-love_logo.png",
  ])("不正またはローカル外のURLはDB照会も削除もしない: %s", async (url) => {
    await addFiles("local.png", ".upload-sweep.json");
    await writeFile(path.join(root, "secret.txt"), "x");

    await expect(cleanup([url])).resolves.toBeUndefined();
    expect(products).not.toHaveBeenCalled();
    expect(works).not.toHaveBeenCalled();
    expect(await remaining()).toEqual([".upload-sweep.json", "local.png"]);
    expect(await readdir(root)).toContain("secret.txt");
  });

  it("外部URLの同名ファイルは、ローカル画像の参照には含めない", async () => {
    products.mockResolvedValue([{ images: ["https://example.com/uploads/local.png"] }]);
    await addFiles("local.png");
    await cleanup(["/uploads/local.png"]);
    expect(await remaining()).toEqual([]);
  });

  it("エンコード済みファイル名を二重デコードせず、対象ファイルだけ削除する", async () => {
    await addFiles("a%20b.png", "a b.png", "a#b.png");
    await cleanup(["/uploads/a%2520b.png", "/uploads/a%23b.png"]);
    expect(await remaining()).toEqual(["a b.png"]);
  });

  it("参照確認が失敗したらファイルを残し、保存後の処理を失敗させない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    products.mockRejectedValue(new Error("database unavailable"));
    await addFiles("local.png");
    await expect(cleanup(["/uploads/local.png"])).resolves.toBeUndefined();
    expect(await remaining()).toEqual(["local.png"]);
  });

  it("既にないファイルは無視し、別ファイルの削除は続行する", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await addFiles("old.png");
    await expect(cleanup(["/uploads/missing.png", "/uploads/old.png"])).resolves.toBeUndefined();
    expect(await remaining()).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
