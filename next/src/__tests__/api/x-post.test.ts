import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, roleCases, sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enforceRateLimit: vi.fn(),
  getXCredentials: vi.fn(),
  postToX: vi.fn(),
  uploadMedia: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  RATE_LIMITS: { xPost: { limit: 10, windowMs: 3_600_000 } },
}));
vi.mock("@/lib/x-client", () => ({
  getXCredentials: mocks.getXCredentials,
  postToX: mocks.postToX,
  uploadMedia: mocks.uploadMedia,
}));

import { POST as postX } from "@/app/api/x/post/route";

// 画像の読み込み部分は #406 で作り替え中のため、ここでは本文だけの投稿を扱う。
const credentials = { apiKey: "k", apiSecret: "s", accessToken: "t", accessTokenSecret: "ts" };
const request = (body: unknown) => jsonRequest("http://localhost/api/x/post", "POST", body);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(sessionFor("ADMIN"));
  mocks.enforceRateLimit.mockResolvedValue({ limited: null, result: { success: true, remaining: 9, resetAt: 0 } });
  mocks.getXCredentials.mockReturnValue(credentials);
  mocks.postToX.mockResolvedValue({ success: true, status: 200, postId: "999" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("X 投稿の権限", () => {
  it.each(roleCases("ADMIN"))("$label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await postX(request({ text: "本文" }));
    expect(response.status).toBe(status);
    expect(mocks.postToX).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });
});

describe("X 投稿", () => {
  it("認可より先にレート制限を確認し、超過なら認証も投稿もしない", async () => {
    const limited = NextResponse.json({ success: false }, { status: 429 });
    mocks.enforceRateLimit.mockResolvedValue({ limited, result: { success: false, remaining: 0, resetAt: 0 } });
    const response = await postX(request({ text: "本文" }));
    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(expect.anything(), "x-post", { limit: 10, windowMs: 3_600_000 });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.postToX).not.toHaveBeenCalled();
  });

  it("権限のない呼び出しもレート制限に数える", async () => {
    mocks.auth.mockResolvedValue(null);
    await postX(request({ text: "本文" }));
    expect(mocks.enforceRateLimit).toHaveBeenCalledTimes(1);
  });

  it("投稿に成功したら Post ID と URL を返す", async () => {
    const response = await postX(request({ text: "新作です" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ postId: "999", url: "https://x.com/kaza_love_/status/999" });
    expect(mocks.postToX).toHaveBeenCalledWith("新作です", [], credentials);
    expect(mocks.uploadMedia).not.toHaveBeenCalled();
  });

  it("Post ID が返らなければ URL も返さない", async () => {
    mocks.postToX.mockResolvedValue({ success: true, status: 200 });
    const response = await postX(request({ text: "本文" }));
    expect(await response.json()).toEqual({});
  });

  it("X の認証情報が未設定なら503で、投稿しない", async () => {
    mocks.getXCredentials.mockReturnValue(null);
    const response = await postX(request({ text: "本文" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("X_API_KEY");
    expect(mocks.postToX).not.toHaveBeenCalled();
  });

  it("投稿の失敗はクライアントの返したステータスとメッセージで返す", async () => {
    mocks.postToX.mockResolvedValue({ success: false, status: 502, message: "X への投稿に失敗しました: HTTP 500" });
    const response = await postX(request({ text: "本文" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "X への投稿に失敗しました: HTTP 500" });
  });

  it.each([
    {},
    { text: "" },
    { text: "本文", imageUrls: ["https://evil.example/a.png"] },
    { text: "本文", imageUrls: ["/uploads/../../etc/passwd"] },
  ])("不正な入力は投稿せず400: %j", async (body) => {
    const response = await postX(request(body));
    expect(response.status).toBe(400);
    expect(mocks.postToX).not.toHaveBeenCalled();
  });

  it("予期しない例外は500", async () => {
    mocks.postToX.mockRejectedValue(new Error("boom"));
    expect((await postX(request({ text: "本文" }))).status).toBe(500);
  });
});
