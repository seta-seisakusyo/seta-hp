import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { handleApiError, isErrorResponse, parseAdminJson } from "@/lib/api-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { XPostSchema } from "@/lib/validation";
import { getXCredentials, postToX, uploadMedia } from "@/lib/x-client";
import { getActualMimeType, isAllowedImageType, MAX_IMAGE_SIZE } from "@/lib/upload-validation";

/**
 * X (旧Twitter) への手動投稿。
 *
 * 自動投稿ではなく管理者が内容を確認してから叩く前提のエンドポイント。
 * 商品写真には選手名・チームロゴが写り込むことがあり、掲載ガイドライン(issue #130)が
 * 未策定のうちは人の目を通さずに外部配信しない方針のため、意図的に手動トリガーにしている。
 */
export async function POST(req: NextRequest) {
  try {
    // 従量課金なので、認可より先にレート制限で連打を止める
    const { limited } = await enforceRateLimit(req, "x-post", RATE_LIMITS.xPost);
    if (limited) return limited;

    const parsed = await parseAdminJson(req, XPostSchema);
    if (isErrorResponse(parsed)) return parsed;
    const { text, imageUrls } = parsed;

    const credentials = getXCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: "X の認証情報が設定されていません（X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET）" },
        { status: 503 }
      );
    }

    // 画像は /uploads/ 配下の実ファイルのみ。Zodで形式は絞ってあるが、
    // ".." 等でディレクトリ外へ抜けられないことを解決後のパスでも確認する。
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const mediaIds: string[] = [];

    for (const url of imageUrls) {
      const filePath = path.resolve(uploadDir, path.basename(url));
      if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
        return NextResponse.json({ error: "不正な画像パスです" }, { status: 400 });
      }

      let buffer: Buffer;
      try {
        buffer = await readFile(filePath);
      } catch {
        return NextResponse.json(
          { error: `画像が見つかりません: ${url}` },
          { status: 400 }
        );
      }

      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `画像サイズが大きすぎます: ${url}` },
          { status: 400 }
        );
      }

      // 拡張子ではなくマジックナンバーで判定する（既存アップロードと同じ基準）
      const mimeType = getActualMimeType(buffer);
      if (!mimeType || !isAllowedImageType(mimeType)) {
        return NextResponse.json(
          { error: `対応していない画像形式です: ${url}` },
          { status: 400 }
        );
      }

      const uploaded = await uploadMedia(buffer, mimeType, credentials);
      if ("error" in uploaded) {
        return NextResponse.json({ error: uploaded.error }, { status: 502 });
      }
      mediaIds.push(uploaded.mediaId);
    }

    const result = await postToX(text, mediaIds, credentials);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      postId: result.postId,
      url: result.postId ? `https://x.com/kaza_love_/status/${result.postId}` : undefined,
    });
  } catch (error) {
    return handleApiError(error, {
      log: "X 投稿エラー",
      message: "X への投稿に失敗しました",
    });
  }
}
