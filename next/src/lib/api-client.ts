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

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (response.ok && response.status === 204) return null as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? data.error
      : undefined;
    throw new Error(typeof message === "string" && message ? message : fallbackMessage);
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
