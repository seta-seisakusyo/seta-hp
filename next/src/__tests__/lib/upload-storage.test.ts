import { mkdir, mkdtemp, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_SIZE } from "@/lib/image-upload-constants";
import {
  readUploadedImage,
  removeSavedUploads,
  saveUploadedImage,
  unlinkUpload,
} from "@/lib/upload-storage";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let root: string;
let uploadDir: string;
const addFiles = (...names: string[]) =>
  Promise.all(names.map((name) => writeFile(path.join(uploadDir, name), PNG)));
const remaining = async () => (await readdir(uploadDir)).sort();

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "upload-storage-"));
  uploadDir = path.join(root, "uploads");
  await mkdir(uploadDir);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("removeSavedUploads", () => {
  it("UUID のファイル名（数字の 0 を含む）を消す（#406 の不具合）", async () => {
    const names = ["00000000-0000-4000-8000-000000000000.png", "3fa3f74c-a457-454a-858e-27fe4f39df30.webp"];
    await addFiles(...names, "keep.png");
    await removeSavedUploads(names.map((name) => `/uploads/${name}`), { uploadDir });
    expect(await remaining()).toEqual(["keep.png"]);
  });

  it("保存先の外やドットファイルを指す URL は無視する", async () => {
    await addFiles(".upload-sweep.json", "keep.png");
    await writeFile(path.join(root, "secret.txt"), "x");
    await removeSavedUploads(
      ["/uploads/../secret.txt", "/uploads/%2e%2e/secret.txt", "/uploads/.upload-sweep.json", "/other/keep.png", "https://evil.example/uploads/keep.png"],
      { uploadDir },
    );
    expect(await remaining()).toEqual([".upload-sweep.json", "keep.png"]);
    expect(await readdir(root)).toContain("secret.txt");
  });

  it("既にないファイルがあっても他を消し、例外を投げない", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await addFiles("a0.png");
    await expect(removeSavedUploads(["/uploads/missing.png", "/uploads/a0.png"], { uploadDir })).resolves.toBeUndefined();
    expect(await remaining()).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });

  it("保存した画像の URL をそのまま渡せば消える", async () => {
    const saved = await saveUploadedImage(new File([PNG], "a.png", { type: "image/png" }), { uploadDir });
    expect("url" in saved).toBe(true);
    if (!("url" in saved)) return;
    expect(saved.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    expect(await remaining()).toHaveLength(1);
    await removeSavedUploads([saved.url], { uploadDir });
    expect(await remaining()).toEqual([]);
  });
});

describe("unlinkUpload", () => {
  it("消せたら true、ない・不正な名前なら false", async () => {
    await addFiles("a.png");
    expect(await unlinkUpload("a.png", { uploadDir })).toBe(true);
    expect(await unlinkUpload("a.png", { uploadDir })).toBe(false);
    expect(await unlinkUpload("..", { uploadDir })).toBe(false);
    expect(await unlinkUpload("../x", { uploadDir })).toBe(false);
  });
});

describe("readUploadedImage", () => {
  it("アップロード画像を読み、実際の形式を返す", async () => {
    await addFiles("a0.png");
    const image = await readUploadedImage("/uploads/a0.png", { uploadDir });
    expect(image).toEqual({ buffer: PNG, mimeType: "image/png" });
  });

  it("ない画像・画像でないファイル・大きすぎるファイル・不正なパスはエラー", async () => {
    await writeFile(path.join(uploadDir, "text.png"), "not an image");
    await writeFile(path.join(uploadDir, "big.png"), Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_SIZE)]));
    expect(await readUploadedImage("/uploads/missing.png", { uploadDir })).toEqual({ error: "画像が見つかりません: /uploads/missing.png" });
    expect(await readUploadedImage("/uploads/text.png", { uploadDir })).toEqual({ error: "対応していない画像形式です: /uploads/text.png" });
    expect(await readUploadedImage("/uploads/big.png", { uploadDir })).toEqual({ error: "画像サイズが大きすぎます: /uploads/big.png" });
    expect(await readUploadedImage("/uploads/../secret.png", { uploadDir })).toEqual({ error: "不正な画像パスです" });
  });
});
