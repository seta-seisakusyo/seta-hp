import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

const fetchMock = vi.fn();

function siteverify(body: Record<string, unknown>, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

const passing = { success: true, score: 0.9, action: "contact_form", hostname: "kaza-love.com" };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "secret-key");
  vi.stubEnv("ALLOWED_RECAPTCHA_HOSTNAMES", "");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(siteverify(passing));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifyRecaptchaToken の入力と設定", () => {
  it.each([undefined, null, "", 123, {}])("トークンがない・文字列でないなら400で、Google へ問い合わせない: %j", async (token) => {
    expect(await verifyRecaptchaToken(token)).toEqual({ success: false, status: 400, message: "No token provided" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("秘密鍵が未設定なら問い合わせずに失敗にする（fail closed）", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    const result = await verifyRecaptchaToken("token");
    expect(result).toMatchObject({ success: false, status: 500 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("秘密鍵とトークンを URL エンコードして siteverify へ POST する", async () => {
    await verifyRecaptchaToken("a+b&c=d");
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe("https://www.google.com/recaptcha/api/siteverify");
    expect(parsed.searchParams.get("secret")).toBe("secret-key");
    expect(parsed.searchParams.get("response")).toBe("a+b&c=d");
    expect(init).toEqual({ method: "POST" });
  });
});

describe("verifyRecaptchaToken の判定", () => {
  it("success・action・スコアがそろえば成功", async () => {
    expect(await verifyRecaptchaToken("token", "contact_form")).toEqual({ success: true, status: 200 });
  });

  it("Google が success=false を返したら400", async () => {
    fetchMock.mockResolvedValue(siteverify({ ...passing, success: false }));
    expect(await verifyRecaptchaToken("token")).toEqual({ success: false, status: 400, message: "Invalid token" });
  });

  it("action が期待と違えば400", async () => {
    fetchMock.mockResolvedValue(siteverify({ ...passing, action: "login" }));
    expect(await verifyRecaptchaToken("token", "contact_form")).toMatchObject({ success: false, status: 400, message: "Action mismatch" });
  });

  it("期待する action を指定しなければ action は問わない", async () => {
    fetchMock.mockResolvedValue(siteverify({ ...passing, action: "anything" }));
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: true });
  });

  it.each([
    { score: 0.5, success: true },
    { score: 0.49, success: false },
    { score: 0, success: false },
  ])("スコアの閾値は0.5（$score → $success）", async ({ score, success }) => {
    fetchMock.mockResolvedValue(siteverify({ ...passing, score }));
    const result = await verifyRecaptchaToken("token");
    expect(result.success).toBe(success);
    if (!success) expect(result).toMatchObject({ status: 403, message: "Low score, verification failed" });
  });

  it.each([undefined, null, "0.9"])("スコアが数値でなければ失敗にする: %j", async (score) => {
    fetchMock.mockResolvedValue(siteverify({ ...passing, score }));
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: false, status: 403 });
  });
});

describe("verifyRecaptchaToken のホスト名の許可リスト", () => {
  it("許可リストが未設定ならホスト名を問わない", async () => {
    vi.stubEnv("ALLOWED_RECAPTCHA_HOSTNAMES", "");
    fetchMock.mockResolvedValue(siteverify({ ...passing, hostname: "evil.example" }));
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: true });
  });

  it("カンマ区切り（前後の空白は無視）のどれかに一致すれば成功", async () => {
    vi.stubEnv("ALLOWED_RECAPTCHA_HOSTNAMES", " localhost , kaza-love.com ,");
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: true });
  });

  it("許可リストにないホスト名は400", async () => {
    vi.stubEnv("ALLOWED_RECAPTCHA_HOSTNAMES", "kaza-love.com");
    fetchMock.mockResolvedValue(siteverify({ ...passing, hostname: "evil.example" }));
    expect(await verifyRecaptchaToken("token")).toEqual({ success: false, status: 400, message: "Invalid hostname" });
  });
});

describe("verifyRecaptchaToken の通信失敗（fail closed）", () => {
  it("通信エラーは500で失敗にする", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: false, status: 500 });
  });

  it("siteverify が HTTP エラーを返したら500で失敗にする", async () => {
    fetchMock.mockResolvedValue(siteverify(passing, { ok: false, status: 503 }));
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: false, status: 500 });
  });

  it("応答が JSON でなければ500で失敗にする", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } });
    expect(await verifyRecaptchaToken("token")).toMatchObject({ success: false, status: 500 });
  });
});
