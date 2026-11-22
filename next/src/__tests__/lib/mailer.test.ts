import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));

const createdAt = new Date("2026-01-02T03:04:05Z");
// xss でサニタイズ済みの値（InquiryStoredSchema の解析結果と同じ形）
const inquiry = {
  id: 42,
  createdAt,
  name: "&lt;山田&gt; &amp;",
  email: "yamada@example.com",
  phone: "090-1234-5678",
  inquiry: "&lt;script&gt;alert(1)&lt;/script&gt; & more",
};

// #409 以前のルートにあった本文をそのまま写したもの（空白・改行を含めて同じであること）
const legacyNotificationHtml = `
          <h3>新しいお問い合わせがありました。</h3>
          <p><strong>お名前:</strong> ${inquiry.name}</p>
          <p><strong>メール:</strong> ${inquiry.email}</p>
          <p><strong>電話番号:</strong> ${inquiry.phone}</p>
          <p><strong>お問い合わせ内容:</strong><br>${inquiry.inquiry}</p>
          <hr />
          <p><small>ID: ${inquiry.id} / ${inquiry.createdAt}</small></p>
        `;
const legacyAutoReplyHtml = `
          <p>${inquiry.name} 様</p>
          <p>このたびは 飾Love(かざらぶ)へのお問い合わせ、誠にありがとうございます。</p>
          <p>以下の内容で受け付けました。</p>
          <hr />
          <p>${inquiry.inquiry}</p>
          <hr />
          <p>２営業日以内に、担当者よりご連絡いたします。</p>
          <p>飾Love(かざらぶ)<br>
          Email: info@kaza-love.com<br>
          </p>
        `;

// トランスポーターはモジュール内で一度だけ作るため、テストごとに読み込み直す
async function loadMailer() {
  vi.resetModules();
  return import("@/lib/mailer");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendMail.mockResolvedValue({});
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_PORT", "");
  vi.stubEnv("SMTP_USER", "smtp@example.com");
  vi.stubEnv("SMTP_PASS", "secret");
  vi.stubEnv("CONTACT_TO_EMAIL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendInquiryNotification", () => {
  it("管理者宛に変更前と同じ件名・本文で送る", async () => {
    const { sendInquiryNotification } = await loadMailer();
    await sendInquiryNotification(inquiry);
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: '"飾Love お問い合わせフォーム" <smtp@example.com>',
      to: "smtp@example.com",
      subject: "【飾Love お問い合わせ】&lt;山田&gt; &amp; 様より",
      html: legacyNotificationHtml,
    });
    const { html } = mocks.sendMail.mock.calls[0][0];
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain(`ID: 42 / ${createdAt}`);
  });

  it("CONTACT_TO_EMAIL があればそちらへ送る", async () => {
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    const { sendInquiryNotification } = await loadMailer();
    await sendInquiryNotification(inquiry);
    expect(mocks.sendMail.mock.calls[0][0].to).toBe("owner@example.com");
  });

  it("SMTP の接続設定は環境変数から作り、2回目以降は使い回す", async () => {
    const { sendInquiryNotification, sendInquiryAutoReply } = await loadMailer();
    await sendInquiryNotification(inquiry);
    await sendInquiryAutoReply(inquiry);
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "smtp@example.com", pass: "secret" },
    });
  });
});

describe("sendInquiryAutoReply", () => {
  it("問い合わせた本人へ変更前と同じ件名・本文で送る", async () => {
    const { sendInquiryAutoReply } = await loadMailer();
    await sendInquiryAutoReply(inquiry);
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: '"飾Love" <smtp@example.com>',
      to: "yamada@example.com",
      subject: "【飾Love・自動返信】お問い合わせありがとうございます",
      html: legacyAutoReplyHtml,
    });
  });
});

describe("SMTP_USER 未設定", () => {
  it.each([undefined, ""])("送信元を作れないため、送信せずに設定エラーにする: %j", async (value) => {
    vi.stubEnv("SMTP_USER", value);
    const { sendInquiryNotification, sendInquiryAutoReply, MailerConfigError } = await loadMailer();
    await expect(sendInquiryNotification(inquiry)).rejects.toBeInstanceOf(MailerConfigError);
    await expect(sendInquiryAutoReply(inquiry)).rejects.toBeInstanceOf(MailerConfigError);
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
