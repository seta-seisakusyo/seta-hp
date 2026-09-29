import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiJson,
  ApiRequestError,
  isAbortError,
  isRateLimitedError,
  RATE_LIMITED_MESSAGE,
  uploadImage,
} from "@/lib/api-client";

describe("isAbortError", () => {
  it("AbortErrorだけを意図的なキャンセルとして扱う", () => {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";

    expect(isAbortError(aborted)).toBe(true);
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError(new Error("network error"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});

afterEach(() => vi.unstubAllGlobals());

function respond(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiJson", () => {
  it("JSON送信時も認証ヘッダーとAbortSignalを保持する", async () => {
    const fetchMock = respond(Response.json({ success: true }));
    const signal = new AbortController().signal;
    await expect(apiJson("/api/news", {
      method: "POST", body: { title: "test" }, headers: { "X-Test": "value" }, signal,
    })).resolves.toEqual({ success: true });
    const options = fetchMock.mock.calls[0][1];
    expect(options.body).toBe('{"title":"test"}');
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.headers.get("X-Test")).toBe("value");
    expect(options.signal).toBe(signal);
  });

  it("APIのエラーメッセージを保持する", async () => {
    respond(Response.json({ error: "権限がありません" }, { status: 403 }));
    await expect(apiJson("/api/news")).rejects.toThrow("権限がありません");
  });

  it.each([200, 502])("JSONでないHTTP %i応答を成功扱いしない", async (status) => {
    respond(new Response("<html>error</html>", { status }));
    await expect(apiJson("/api/news")).rejects.toThrow("リクエストに失敗しました");
  });

  it("文字列でないerrorフィールドは共通メッセージへ置き換える", async () => {
    respond(Response.json({ error: { reason: "failed" } }, { status: 400 }));
    await expect(apiJson("/api/news")).rejects.toThrow("リクエストに失敗しました");
  });

  it("204応答は本文を要求しない", async () => {
    respond(new Response(null, { status: 204 }));
    await expect(apiJson("/api/news", { method: "DELETE" })).resolves.toBeNull();
  });

  it("応答読み取り中のキャンセルを通常の失敗に変換しない", async () => {
    const response = Response.json({});
    const aborted = new DOMException("aborted", "AbortError");
    vi.spyOn(response, "json").mockRejectedValue(aborted);
    respond(response);
    await expect(apiJson("/api/news")).rejects.toBe(aborted);
  });
});

describe("uploadImage", () => {
  const file = new File(["image"], "test.png", { type: "image/png" });

  it("FormDataで送信し、アップロード先URLを返す", async () => {
    const fetchMock = respond(Response.json({ url: "/uploads/test.png" }));
    await expect(uploadImage(file)).resolves.toBe("/uploads/test.png");
    const options = fetchMock.mock.calls[0][1];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("file").name).toBe("test.png");
    expect(options.headers).toBeUndefined();
  });

  it.each([null, {}, { url: 123 }, { url: " " }])("URLがない成功応答を拒否する: %j", async (data) => {
    respond(Response.json(data));
    await expect(uploadImage(file)).rejects.toThrow("アップロード先URLを取得できませんでした");
  });

  it("アップロードAPIのエラーを伝える", async () => {
    respond(Response.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 }));
    await expect(uploadImage(file)).rejects.toThrow("ファイルサイズは5MB以下にしてください");
  });
});

describe("レート制限（429）", () => {
  it("Nginx の HTML 応答でも JSON を解析する前に判定し、共通の案内を出す", async () => {
    respond(new Response("<html><h1>429 Too Many Requests</h1></html>", { status: 429 }));
    const error = await apiJson("/api/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(isRateLimitedError(error)).toBe(true);
    expect((error as Error).message).toBe(RATE_LIMITED_MESSAGE);
  });

  it("アプリのレート制限は JSON の案内文をそのまま使う", async () => {
    respond(Response.json({ success: false, error: "送信回数が上限に達しました。" }, { status: 429 }));
    await expect(apiJson("/api/email", { method: "POST", body: {} })).rejects.toThrow("送信回数が上限に達しました。");
  });

  it("画像アップロードでも 429 を判定できる", async () => {
    respond(new Response("<html>429</html>", { status: 429 }));
    const error = await uploadImage(new File(["x"], "a.png", { type: "image/png" })).catch((e: unknown) => e);
    expect(isRateLimitedError(error)).toBe(true);
  });

  it("429 以外の失敗は状態コードを持つが、レート制限とはみなさない", async () => {
    respond(Response.json({ error: "権限がありません" }, { status: 403 }));
    const error = await apiJson("/api/news").catch((e: unknown) => e);
    expect((error as ApiRequestError).status).toBe(403);
    expect(isRateLimitedError(error)).toBe(false);
  });
});
