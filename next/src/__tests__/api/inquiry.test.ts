import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
// メール送信は @/lib/mailer（"server-only"）へ移した。Next.js 外のテストでは空モジュールにする。
vi.mock("server-only", () => ({}));

import xss from "xss";
import * as z from "zod";
import { POST as submitInquiry } from "@/app/api/email/route";
import { POST as verifyRecaptcha } from "@/app/api/recaptcha/route";
import { getValidationErrors, InquirySchema, validateInquiry } from "@/lib/validation";

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
  // SMTP_USER 未設定では送信しなくなった（#409）ため、送信元を設定しておく
  vi.stubEnv("SMTP_USER", "smtp@example.com");
  vi.stubEnv("CONTACT_TO_EMAIL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
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

/**
 * #409 以前のルートの手順（検証 → xss → 同じスキーマで再検証）。
 * InquiryStoredSchema の1回の解析が同じ結果になることを確かめるための基準。
 */
function legacyParse(body: unknown):
  | { status: 400; errors: Record<string, string> }
  | { status: 200; data: Record<string, string> } {
  const parsed = InquirySchema.extend({ recaptchaToken: z.unknown().optional() }).safeParse(body);
  if (!parsed.success) return { status: 400, errors: getValidationErrors(parsed.error) };
  const data = {
    name: xss(parsed.data.name),
    email: xss(parsed.data.email),
    phone: xss(parsed.data.phone || ""),
    inquiry: xss(parsed.data.inquiry),
  };
  const errors = validateInquiry(data);
  return Object.keys(errors).length > 0 ? { status: 400, errors } : { status: 200, data };
}

describe("サニタイズ後の文字数（変更前と同じ結果）", () => {
  // xss は < と > だけを &lt; &gt;（4文字）にし、& はそのまま残す。
  // < の直後に英字が続くとタグの始まりと見なされ、閉じていなくても形が変わる（例: "<aa" の末尾）。
  // 文字数がどう変わるかは xss 任せなので、どの入力でも変更前の手順と同じ結果になることを確かめる。
  it.each([
    { label: "< の後に英字が続く上限付近の氏名", body: { ...valid, name: "<".repeat(12) + "aa" } },
    { label: "& だけで上限ちょうどの氏名", body: { ...valid, name: "&".repeat(50) } },
    { label: "&lt; 相当で上限ちょうどの氏名", body: { ...valid, name: "<".repeat(12) + "12" } },
    { label: "&lt; 相当で1文字超える氏名", body: { ...valid, name: "<".repeat(12) + "123" } },
    { label: "< と & が混在して上限内の氏名", body: { ...valid, name: "<&".repeat(10) } },
    { label: "< と & が混在して上限を超える氏名", body: { ...valid, name: "<&".repeat(11) } },
    { label: "タグ風の文字列を含む氏名", body: { ...valid, name: "<x>&<y>" } },
    { label: "& だけで上限ちょうどの内容", body: { ...valid, inquiry: "&".repeat(500) } },
    { label: "&lt; 相当で上限ちょうどの内容", body: { ...valid, inquiry: "<".repeat(125) } },
    { label: "&lt; 相当で上限を超える内容", body: { ...valid, inquiry: "<".repeat(125) + "a" } },
    { label: "許可タグを含む上限付近の内容", body: { ...valid, inquiry: "<b>" + "&".repeat(490) + "</b>" } },
    { label: "電話番号なし", body: { name: "山田", email: "a@example.com", inquiry: "x" } },
    { label: "電話番号あり", body: { ...valid, phone: "090-1234-5678" } },
  ])("$label", async ({ body }) => {
    const expected = legacyParse(body);
    const response = await submitInquiry(request(body));
    expect(response.status).toBe(expected.status);
    if (expected.status === 400) {
      expect(await response.json()).toEqual({ success: false, errors: expected.errors });
      expect(mocks.createInquiry).not.toHaveBeenCalled();
    } else {
      expect(mocks.createInquiry.mock.calls[0][0].data).toEqual({ ...expected.data, userId: null });
    }
  });

  it("上限ちょうどと超過の具体例", async () => {
    // "<" 12個 + 2文字 → "&lt;"×12 + 2文字 = 50文字で保存できる
    expect((await submitInquiry(request({ ...valid, name: "<".repeat(12) + "12" }))).status).toBe(200);
    expect(mocks.createInquiry.mock.calls[0][0].data.name).toBe("&lt;".repeat(12) + "12");
    // "&" はエスケープされないので50個まで保存できる
    expect((await submitInquiry(request({ ...valid, name: "&".repeat(50) }))).status).toBe(200);
    expect(mocks.createInquiry.mock.calls[1][0].data.name).toBe("&".repeat(50));
    // 1文字でも超えると氏名の上限エラー
    const response = await submitInquiry(request({ ...valid, name: "<".repeat(12) + "123" }));
    expect(await response.json()).toEqual({
      success: false,
      errors: { name: "氏名は50文字以内で入力してください。" },
    });
  });
});

describe("メール送信", () => {
  it("保存した値で管理者宛と自動返信の2通を送る", async () => {
    const response = await submitInquiry(request({ ...valid, name: "<b>山田</b>" }));
    expect(response.status).toBe(200);
    const [notification, autoReply] = mocks.sendMail.mock.calls.map(([mail]) => mail);
    expect(notification.subject).toBe("【飾Love お問い合わせ】<b>山田</b> 様より");
    expect(notification.from).toBe('"飾Love お問い合わせフォーム" <smtp@example.com>');
    expect(notification.to).toBe("smtp@example.com");
    expect(autoReply.subject).toBe("【飾Love・自動返信】お問い合わせありがとうございます");
    expect(autoReply.from).toBe('"飾Love" <smtp@example.com>');
    expect(autoReply.to).toBe("test@example.com");
  });

  it("メール送信に失敗しても登録は成功として扱う", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await submitInquiry(request(valid));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      expect(mocks.sendMail).toHaveBeenCalledTimes(1); // 管理者宛で失敗したら自動返信は送らない
    } finally {
      consoleError.mockRestore();
    }
  });

  it("SMTP_USER 未設定なら送信せず、登録は成功として扱う", async () => {
    vi.stubEnv("SMTP_USER", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await submitInquiry(request(valid));
      expect(response.status).toBe(200);
      expect(mocks.createInquiry).toHaveBeenCalledTimes(1);
      expect(mocks.sendMail).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith("メール送信エラー（DB登録は完了）:", expect.any(Error));
    } finally {
      consoleError.mockRestore();
    }
  });

  it("保存に失敗したら500で同じ文言を返す", async () => {
    mocks.createInquiry.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await submitInquiry(request(valid));
      expect(response.status).toBe(500);
      expect((await response.json()).error).toBe("送信・登録処理に失敗しました。");
      expect(mocks.sendMail).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
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
