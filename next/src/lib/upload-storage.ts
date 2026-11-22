import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  getActualMimeType,
  getExtensionFromMimeType,
  isAllowedImageType,
  MAX_IMAGE_SIZE,
} from "@/lib/upload-validation";
import type { AllowedImageType } from "@/lib/image-upload-constants";
import { isSafeUploadFileName, uploadFileNameFromUrl, uploadUrlFromFileName } from "@/lib/upload-paths";

/**
 * アップロード画像の保存先ディレクトリ（ここが唯一の定義）。
 * 本番ではリポジトリ直下の uploads/ がここにマウントされ、/uploads/ は Nginx が直接配信する。
 */
export function getUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

type UploadDirOption = { uploadDir?: string };

/**
 * 保存先のファイルを消す。消せたら true、既にない・名前が不正なら false。
 * そのほかの失敗はログに残して false を返す（後片付けで呼び出し元を止めない）。
 */
export async function unlinkUpload(
  fileName: string,
  { uploadDir = getUploadDir(), logLabel = "アップロード画像の削除に失敗:" }: UploadDirOption & { logLabel?: string } = {}
): Promise<boolean> {
  if (!isSafeUploadFileName(fileName)) return false;
  const filePath = path.join(uploadDir, fileName);
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(logLabel, filePath, error);
    }
    return false;
  }
}

export type SavedUpload = { url: string } | { error: string };

/**
 * 画像ファイルを検証して保存先に置き、公開URLを返す。
 * 申告の MIME だけでなく先頭バイトでも形式を確かめる（拡張子偽装の防止）。
 */
export async function saveUploadedImage(
  file: File,
  { uploadDir = getUploadDir() }: UploadDirOption = {}
): Promise<SavedUpload> {
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
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return { url: uploadUrlFromFileName(fileName) };
}

/** 保存したが使わなくなった（DB更新に失敗した等）アップロードを消す。失敗しても処理は止めない。 */
export async function removeSavedUploads(urls: string[], options: UploadDirOption = {}): Promise<void> {
  await Promise.all(urls.map(async (url) => {
    const fileName = uploadFileNameFromUrl(url);
    if (fileName) await unlinkUpload(fileName, options);
  }));
}

export type LoadedUploadedImage = { buffer: Buffer; mimeType: AllowedImageType } | { error: string };

/**
 * アップロード済み画像を読み込み、サイズと実際の形式（先頭バイト）を確かめる。X 投稿で使う。
 * URL の形式は呼び出し側の Zod（uploadedImageUrlSchema）でも絞ってあるが、ここでも
 * 保存先直下の1ファイルを指すことを確かめてから読む。
 */
export async function readUploadedImage(
  url: string,
  { uploadDir = getUploadDir() }: UploadDirOption = {}
): Promise<LoadedUploadedImage> {
  const fileName = uploadFileNameFromUrl(url);
  if (!fileName) return { error: "不正な画像パスです" };
  const filePath = path.join(uploadDir, fileName);

  let buffer: Buffer;
  try {
    // 読み込む前に大きさを確かめ、巨大なファイルをメモリに載せない。
    const info = await stat(filePath);
    if (!info.isFile()) return { error: `画像が見つかりません: ${url}` };
    if (info.size > MAX_IMAGE_SIZE) return { error: `画像サイズが大きすぎます: ${url}` };
    buffer = await readFile(filePath);
  } catch {
    return { error: `画像が見つかりません: ${url}` };
  }
  if (buffer.byteLength > MAX_IMAGE_SIZE) return { error: `画像サイズが大きすぎます: ${url}` };

  // 拡張子ではなくマジックナンバーで判定する（アップロード時と同じ基準）
  const mimeType = getActualMimeType(buffer);
  if (!mimeType || !isAllowedImageType(mimeType)) {
    return { error: `対応していない画像形式です: ${url}` };
  }
  return { buffer, mimeType };
}
