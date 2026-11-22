import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site-config";

/** メール本文に埋め込む問い合わせ。値はサニタイズ済み（InquiryStoredSchema の解析結果）であること。 */
export interface InquiryMail {
  id: number;
  createdAt: Date;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
}

/** SMTP の設定不足。送信を試みずに失敗させる（`<undefined>` 宛の送信元を作らない）。 */
export class MailerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailerConfigError";
  }
}

// SMTP接続を使い回すため、トランスポーターはリクエスト毎ではなく一度だけ生成する
let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/** 送信元アドレス（SMTP の認証ユーザー）。未設定なら MailerConfigError。 */
function getSenderAddress(): string {
  const address = process.env.SMTP_USER;
  if (!address) throw new MailerConfigError("SMTP_USER が設定されていないため、メールを送信できません");
  return address;
}

/** 管理者宛の新着通知。宛先は CONTACT_TO_EMAIL（未設定なら SMTP_USER）。 */
export async function sendInquiryNotification(inquiry: InquiryMail): Promise<void> {
  const sender = getSenderAddress();
  await getTransporter().sendMail({
    from: `"${SITE_NAME} お問い合わせフォーム" <${sender}>`,
    to: process.env.CONTACT_TO_EMAIL || sender,
    subject: `【${SITE_NAME} お問い合わせ】${inquiry.name} 様より`,
    html: `
          <h3>新しいお問い合わせがありました。</h3>
          <p><strong>お名前:</strong> ${inquiry.name}</p>
          <p><strong>メール:</strong> ${inquiry.email}</p>
          <p><strong>電話番号:</strong> ${inquiry.phone}</p>
          <p><strong>お問い合わせ内容:</strong><br>${inquiry.inquiry}</p>
          <hr />
          <p><small>ID: ${inquiry.id} / ${inquiry.createdAt}</small></p>
        `,
  });
}

/** 問い合わせた本人への自動返信。 */
export async function sendInquiryAutoReply(inquiry: InquiryMail): Promise<void> {
  const sender = getSenderAddress();
  await getTransporter().sendMail({
    from: `"${SITE_NAME}" <${sender}>`,
    to: inquiry.email,
    subject: `【${SITE_NAME}・自動返信】お問い合わせありがとうございます`,
    html: `
          <p>${inquiry.name} 様</p>
          <p>このたびは ${SITE_NAME}(かざらぶ)へのお問い合わせ、誠にありがとうございます。</p>
          <p>以下の内容で受け付けました。</p>
          <hr />
          <p>${inquiry.inquiry}</p>
          <hr />
          <p>２営業日以内に、担当者よりご連絡いたします。</p>
          <p>${SITE_NAME}(かざらぶ)<br>
          Email: ${CONTACT_EMAIL}<br>
          </p>
        `,
  });
}
