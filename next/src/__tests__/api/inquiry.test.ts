import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createInquiry: vi.fn(),
  sendMail: vi.fn(),
  auth: vi.fn(),
  isRecaptchaEnabled: vi.fn(),
  verifyRecaptcha: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ inquiry: { create: mocks.createInquiry } }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ limited: null }),
  RATE_LIMITS: { contact: {}, recaptcha: {} },
}));
vi.mock("@/lib/runtime-config", () => ({ isRecaptchaEnabled: mocks.isRecaptchaEnabled }));
vi.mock("@/lib/recaptcha", () => ({ verifyRecaptchaToken: mocks.verifyRecaptcha }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail }) } }));

import { POST as submitInquiry } from "@/app/api/email/route";
import { POST as verifyRecaptcha } from "@/app/api/recaptcha/route";

const valid = { name: "山田太郎", email: "test@example.com", inquiry: "お問い合わせです。" };
const request = (body: unknown) => new NextRequest("http://localhost/api/email", {
  method: "POST", body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.createInquiry.mockResolvedValue({ id: 1, createdAt: new Date() });
  mocks.sendMail.mockResolvedValue({});
  mocks.isRecaptchaEnabled.mockReturnValue(false);
  mocks.verifyRecaptcha.mockResolvedValue({ success: true, status: 200 });
});

describe("問い合わせの入力検証", () => {
  it.each([null, [], 1, "text", { ...valid, name: { value: "name" } }, { ...valid, inquiry: 123 }])(
    "不正入力を400にし、保存・メール送信しない: %j", async (body) => {
      const response = await submitInquiry(request(body));
      expect(response.status).toBe(400);
      expect(mocks.createInquiry).not.toHaveBeenCalled();
      expect(mocks.sendMail).not.toHaveBeenCalled();
    }
  );

  it.each([
    { field: "name", value: "<".repeat(50), message: "氏名は50文字以内で入力してください。" },
    { field: "inquiry", value: "<".repeat(500), message: "お問い合わせ内容は500文字以内で入力してください。" },
  ])("サニタイズ後に上限を超える$fieldを400にし、保存・送信しない", async ({ field, value, message }) => {
    const response = await submitInquiry(request({ ...valid, [field]: value }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, errors: { [field]: message } });
    expect(mocks.createInquiry).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("サニタイズ後ちょうど上限の氏名は保存できる", async () => {
    const response = await submitInquiry(request({ ...valid, name: ">".repeat(12) + "aa" }));
    expect(response.status).toBe(200);
    expect(mocks.createInquiry.mock.calls[0][0].data.name).toBe("&gt;".repeat(12) + "aa");
  });

  it("フィールドごとのエラー形式を維持する", async () => {
    const response = await submitInquiry(request({ name: "", email: "invalid", inquiry: "" }));
    expect(await response.json()).toEqual({
      success: false,
      errors: {
        name: "氏名を入力してください。",
        email: "有効なメールアドレスを入力してください。",
        inquiry: "お問い合わせ内容を入力してください。",
      },
    });
  });

  it("検証済み文字列をサニタイズして保存し、監査用ユーザーIDを保持する", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const response = await submitInquiry(request({ ...valid, inquiry: '<script>alert("x")</script>' }));
    expect(response.status).toBe(200);
    expect(mocks.createInquiry).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ phone: "", userId: "user-1" }),
    }));
    const data = mocks.createInquiry.mock.calls[0][0].data;
    expect(data.inquiry).not.toContain("<script>");
    expect(data.inquiry).toContain("&lt;script&gt;");
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });

  it("reCAPTCHAが有効なら、検証に通らない問い合わせは保存しない", async () => {
    mocks.isRecaptchaEnabled.mockReturnValue(true);
    mocks.verifyRecaptcha.mockResolvedValue({ success: false, status: 400 });
    const response = await submitInquiry(request({ ...valid, recaptchaToken: "invalid" }));
    expect(response.status).toBe(400);
    expect(mocks.verifyRecaptcha).toHaveBeenCalledWith("invalid", "contact_form");
    expect(mocks.createInquiry).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("reCAPTCHAリクエストの型検証", () => {
  it.each([null, [], { token: "test", expectedAction: 123 }])("不正入力を400で返す: %j", async (body) => {
    const response = await verifyRecaptcha(request(body));
    expect(response.status).toBe(400);
    expect(mocks.verifyRecaptcha).not.toHaveBeenCalled();
  });

  it("トークンと期待するactionを検証関数へ渡す", async () => {
    const response = await verifyRecaptcha(request({ token: "test", expectedAction: "contact_form" }));
    expect(response.status).toBe(200);
    expect(mocks.verifyRecaptcha).toHaveBeenCalledWith("test", "contact_form");
  });
});
