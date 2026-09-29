interface ApiJsonOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/** AbortControllerによる意図的なキャンセルかを環境非依存で判定する。 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

/** レート制限（429）に当たったときの案内。管理画面の保存・一覧取得で共通に使う。 */
export const RATE_LIMITED_MESSAGE = "アクセスが集中しています。少し待ってからお試しください。";

/** API が失敗応答を返したときのエラー。状態コードで分岐できるよう保持する。 */
export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** レート制限（429）による失敗か。 */
export function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 429;
}

/**
 * 429 の本文から案内文を取り出す。アプリのレート制限は JSON の error を返すのでそれを使い、
 * Nginx の制限（HTML）など読めない本文なら共通の案内にする。
 */
async function readRateLimitMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" && data.error) {
      return data.error;
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
  }
  return RATE_LIMITED_MESSAGE;
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (response.ok && response.status === 204) return null as T;
  // 429 は JSON の解析より先に扱う（Nginx の制限応答は HTML で、解析に失敗すると理由が消える）
  if (response.status === 429) {
    throw new ApiRequestError(await readRateLimitMessage(response), 429);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (!response.ok) throw new ApiRequestError(fallbackMessage, response.status);
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? data.error
      : undefined;
    throw new ApiRequestError(typeof message === "string" && message ? message : fallbackMessage, response.status);
  }

  return data as T;
}

/** JSON送信と、HTTPエラー・不正なJSON応答の処理を共通化する。 */
export async function apiJson<T = unknown>(
  url: string,
  options?: ApiJsonOptions
): Promise<T> {
  const { body, ...requestOptions } = options ?? {};
  const headers = new Headers(requestOptions.headers);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...requestOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return readJsonResponse<T>(response, "リクエストに失敗しました");
}

/** 画像アップロード。成功応答にURLが含まれることも検証する。 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await readJsonResponse<unknown>(response, "アップロードに失敗しました");

  if (
    typeof data !== "object" || data === null || !("url" in data) ||
    typeof data.url !== "string" || !data.url.trim()
  ) {
    throw new Error("アップロード先URLを取得できませんでした");
  }
  return data.url;
}
