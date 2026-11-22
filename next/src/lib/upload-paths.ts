import * as z from "zod";
import { normalizeImageUrl } from "@/lib/images";

/**
 * アップロード画像の URL とファイル名の扱い（#406）。
 *
 * 公開 URL は `/uploads/<ファイル名>`、実体は保存先ディレクトリ直下の `<ファイル名>`。
 * URL からファイル名を取り出す規則はここだけに置き、保存・削除・回収・X 投稿・入力検証で共有する。
 * クライアントの部品（validation.ts 経由）からも読まれるので、fs などサーバー専用のものは
 * import しない。保存先ディレクトリと削除は upload-storage.ts にある。
 */

export const UPLOAD_URL_PREFIX = "/uploads/";

/** 保存する画像 URL の長さの上限（スリーブ画像の列などに合わせる）。 */
export const UPLOAD_URL_MAX = 191;

/**
 * 保存先ディレクトリ直下の1ファイルを指す名前か。
 * 区切り文字・NUL を含むもの、"." で始まるもの（"." / ".." と、回収の記録などのドットファイル）は不可。
 */
export function isSafeUploadFileName(name: string): boolean {
  return name.length > 0 && !/[/\\\0]/.test(name) && !name.startsWith(".");
}

/**
 * 画像 URL からアップロード画像のファイル名を取り出す。アップロード画像でなければ null。
 * 旧ドメインを含む同一サイトの絶対 URL・"uploads/..." も同じファイルとして扱う
 * （normalizeImageUrl と同じ基準）。外部ホストの /uploads/ はローカルのファイルとみなさない。
 */
export function uploadFileNameFromUrl(value: string | null | undefined): string | null {
  const normalized = normalizeImageUrl(value);
  if (!normalized?.startsWith(UPLOAD_URL_PREFIX)) return null;

  try {
    const { pathname } = new URL(normalized, "http://localhost");
    if (!pathname.startsWith(UPLOAD_URL_PREFIX)) return null;
    const fileName = decodeURIComponent(pathname.slice(UPLOAD_URL_PREFIX.length));
    return isSafeUploadFileName(fileName) ? fileName : null;
  } catch {
    // 壊れたパーセントエンコードなど、過去データの不正 URL は対象外にする。
    return null;
  }
}

/** ファイル名から公開 URL を作る。 */
export function uploadUrlFromFileName(fileName: string): string {
  return `${UPLOAD_URL_PREFIX}${encodeURIComponent(fileName)}`;
}

/** `/uploads/<ファイル名>` の形そのもの（クエリ・フラグメント・絶対 URL なし）か。 */
export function isCanonicalUploadUrl(value: string): boolean {
  return value.startsWith(UPLOAD_URL_PREFIX) && !/[?#]/.test(value) && uploadFileNameFromUrl(value) !== null;
}

const UPLOADED_IMAGE_MESSAGE = "画像はアップロード済みのものだけ指定できます";

/**
 * アップロード済み画像の URL（`/uploads/<ファイル名>` のみ）。値は変えない。
 * サーバーが読むファイルを外部から指定させないため、X 投稿などはこちらを使う。
 */
export const uploadedImageUrlSchema = z
  .string({ error: UPLOADED_IMAGE_MESSAGE })
  .max(UPLOAD_URL_MAX, { message: "画像URLが長すぎます" })
  .refine(isCanonicalUploadUrl, { message: UPLOADED_IMAGE_MESSAGE });

/**
 * 商品・作品に保存する画像 URL。管理画面は読み込んだ値をそのまま送り返すので、
 * 過去データにある同一サイトの絶対 URL（旧ドメイン含む）や "uploads/..." は
 * `/uploads/<ファイル名>` に直して受け付ける。外部の URL は受け付けない。
 */
export const storedUploadedImageUrlSchema = z
  .string({ error: UPLOADED_IMAGE_MESSAGE })
  .max(2048, { message: "画像URLが長すぎます" })
  .transform((value, ctx) => {
    const fileName = uploadFileNameFromUrl(value);
    if (fileName === null) {
      ctx.addIssue({ code: "custom", message: UPLOADED_IMAGE_MESSAGE });
      return z.NEVER;
    }
    return uploadUrlFromFileName(fileName);
  })
  .pipe(z.string().max(UPLOAD_URL_MAX, { message: "画像URLが長すぎます" }));
