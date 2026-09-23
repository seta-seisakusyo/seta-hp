import "server-only";
import { createHmac, randomBytes } from "crypto";

/**
 * X (旧Twitter) への投稿クライアント。
 *
 * 投稿先は @kaza_love_ 固定。アカウントを決めるのは ACCESS_TOKEN / ACCESS_TOKEN_SECRET で、
 * API_KEY / API_SECRET は開発者アプリ側の資格情報なので別アプリと共用できる。
 * Developer Portal の「Generate」で発行できるのは開発者本人のトークンだけなので、
 * @kaza_love_ 用のトークンは 3-legged OAuth で別途取得したものを設定する。
 *
 * X API は従量課金（2026年2月にFreeティア廃止）。本文にURLを含むと 1件 $0.20、
 * 含まなければ $0.015 と 13倍の差があるため、リンクは本文ではなくリプライに置く運用を推奨する。
 */

const X_API_BASE = "https://api.x.com/2";
const POST_ENDPOINT = `${X_API_BASE}/tweets`;
const MEDIA_ENDPOINT = `${X_API_BASE}/media/upload`;


interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface XPostResult {
  success: boolean;
  /** 失敗時にAPIが返すべきHTTPステータス（成功時は200） */
  status: number;
  /** 投稿成功時の Post ID */
  postId?: string;
  message?: string;
}

/**
 * 認証情報を環境変数から読む。1つでも欠けていれば null。
 * 未設定のまま呼ばれても「空文字で署名して謎の401」にならないよう、呼び出し側で明示的に弾く。
 */
export function getXCredentials(): XCredentials | null {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return null;
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/**
 * RFC3986 のパーセントエンコード。
 * encodeURIComponent は !*'() を変換しないが、OAuth 1.0a の署名では変換が必須。
 * ここがずれると署名不一致（401）になり、原因が非常に追いにくい。
 */
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * OAuth 1.0a の Authorization ヘッダを組み立てる。
 *
 * 署名対象に含めるのは oauth_* とクエリ文字列のみ。
 * JSON body や multipart body は署名に含めない（Content-Type が
 * application/x-www-form-urlencoded のときだけ body を含める仕様のため）。
 */
function buildAuthHeader(
  method: "POST" | "GET",
  url: string,
  credentials: XCredentials
): string {
  const { searchParams, origin, pathname } = new URL(url);
  const baseUrl = `${origin}${pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const signatureParams: Record<string, string> = { ...oauthParams };
  searchParams.forEach((v, k) => {
    signatureParams[k] = v;
  });

  const normalized = Object.keys(signatureParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(signatureParams[k])}`)
    .join("&");

  const baseString = [
    method,
    percentEncode(baseUrl),
    percentEncode(normalized),
  ].join("&");

  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(
    credentials.accessTokenSecret
  )}`;
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };
  const header = Object.keys(headerParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

/** X API のエラー応答から人が読めるメッセージを組み立てる。 */
async function describeError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      return body.errors
        .map((e: { message?: string }) => e?.message)
        .filter(Boolean)
        .join(" / ");
    }
    if (typeof body?.title === "string") return body.title;
  } catch {
    // JSONでない応答（HTMLのエラーページ等）はステータスだけ返す
  }
  return `HTTP ${response.status}`;
}

/**
 * 画像を X にアップロードし、投稿で参照する media_id を得る。
 * 5MB以下の画像を想定した単純アップロード（チャンク分割は行わない）。
 */
export async function uploadMedia(
  image: Buffer,
  mimeType: string,
  credentials: XCredentials
): Promise<{ mediaId: string } | { error: string }> {
  const form = new FormData();
  form.append("media", new Blob([new Uint8Array(image)], { type: mimeType }));

  try {
    const response = await fetch(MEDIA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader("POST", MEDIA_ENDPOINT, credentials),
      },
      body: form,
    });

    if (!response.ok) {
      return { error: `画像アップロードに失敗しました: ${await describeError(response)}` };
    }

    const body = await response.json();
    // v2 は data.id、互換応答では media_id_string が返る
    const mediaId = body?.data?.id ?? body?.media_id_string;
    if (typeof mediaId !== "string") {
      return { error: "画像アップロードの応答に media_id が含まれていません" };
    }
    return { mediaId };
  } catch (error) {
    console.error("X 画像アップロードエラー:", error);
    return { error: "画像アップロード中に通信エラーが発生しました" };
  }
}

/**
 * X に投稿する。mediaIds を渡すと画像付きになる。
 */
export async function postToX(
  text: string,
  mediaIds: string[],
  credentials: XCredentials
): Promise<XPostResult> {
  const payload: Record<string, unknown> = { text };
  if (mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  try {
    const response = await fetch(POST_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader("POST", POST_ENDPOINT, credentials),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await describeError(response);
      // 401/403 は資格情報かアプリ権限（Read and Write）の設定ミスで、
      // 画面から直せる類ではないため原因を明示する。
      const hint =
        response.status === 401 || response.status === 403
          ? "（認証情報、またはアプリ権限が Read and Write か確認してください）"
          : "";
      return {
        success: false,
        status: 502,
        message: `X への投稿に失敗しました: ${message}${hint}`,
      };
    }

    const body = await response.json();
    const postId = body?.data?.id;
    return {
      success: true,
      status: 200,
      postId: typeof postId === "string" ? postId : undefined,
    };
  } catch (error) {
    console.error("X 投稿エラー:", error);
    return {
      success: false,
      status: 502,
      message: "X への投稿中に通信エラーが発生しました",
    };
  }
}
