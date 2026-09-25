import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  getActualMimeType,
  getExtensionFromMimeType,
  isAllowedImageType,
  MAX_IMAGE_SIZE,
} from "@/lib/upload-validation";

export type SavedUpload = { url: string } | { error: string };

function uploadDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * 画像ファイルを検証して public/uploads に保存し、公開URLを返す。
 * 申告の MIME だけでなく先頭バイトでも形式を確かめる（拡張子偽装の防止）。
 */
export async function saveUploadedImage(file: File): Promise<SavedUpload> {
  if (file.size > MAX_IMAGE_SIZE) {
    return { error: "ファイルサイズは5MB以下にしてください" };
  }
  if (!isAllowedImageType(file.type)) {
    return { error: "JPG, PNG, GIF, WebPのみアップロード可能です" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const actualMimeType = getActualMimeType(buffer);
  if (!actualMimeType || !isAllowedImageType(actualMimeType)) {
    return { error: "不正なファイル形式です。JPG, PNG, GIF, WebPのみアップロード可能です" };
  }

  const fileName = `${crypto.randomUUID()}${getExtensionFromMimeType(actualMimeType)}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), fileName), buffer);
  return { url: `/uploads/${fileName}` };
}

/** 保存したが使わなくなった（DB更新に失敗した等）アップロードを消す。失敗しても処理は止めない。 */
export async function removeSavedUploads(urls: string[]): Promise<void> {
  await Promise.all(urls.map(async (url) => {
    const fileName = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
    if (!fileName || /[/\\0]/.test(fileName)) return;
    try {
      await unlink(path.join(uploadDir(), fileName));
    } catch (error) {
      console.error("アップロード画像の削除に失敗:", error);
    }
  }));
}
