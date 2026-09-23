import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/db";
import { successResponse, validationErrorResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseJsonWithSchema,
  requireAdmin,
} from "@/lib/api-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { InquirySubmissionSchema, validateInquiry } from "@/lib/validation";
import { deleteManagedResource } from "@/lib/managed-resource-route";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import xss from "xss";
import { parsePagination } from "@/lib/pagination";
import { CONTACT_EMAIL } from "@/lib/site-config";
import { isRecaptchaEnabled } from "@/lib/runtime-config";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

const prisma = getPrismaClient();

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

/**
 * ✅ 問い合わせ登録（メール送信 + DB保存）
 */
export async function POST(req: NextRequest) {
  try {
    // レート制限チェック
    const { limited } = await enforceRateLimit(req, "contact", RATE_LIMITS.contact);
    if (limited) return limited;

    const inquiryData = await parseJsonWithSchema(req, InquirySubmissionSchema, "fields");
    if (isErrorResponse(inquiryData)) return inquiryData;

    // 🔹 reCAPTCHA検証（有効時のみ、送信処理と同一ハンドラ内で実施）
    // フォームUIを経由しない /api/email への直接POSTでスパム・任意宛先への自動返信送信
    // （踏み台化）を防ぐため、チャレンジ通過をこのハンドラ内で必須化する。
    if (isRecaptchaEnabled()) {
      const verification = await verifyRecaptchaToken(inquiryData.recaptchaToken, "contact_form");
      if (!verification.success) {
        return NextResponse.json(
          { success: false, error: "reCAPTCHA 検証に失敗しました。" },
          { status: verification.status >= 500 ? 500 : 400 }
        );
      }
    }

    // 型と文字数の検証後に、表示・メール向けのサニタイズを行う。
    const sanitizedData = {
      name: xss(inquiryData.name),
      email: xss(inquiryData.email),
      phone: xss(inquiryData.phone || ""),
      inquiry: xss(inquiryData.inquiry),
    };

    // HTMLエスケープで文字数が増えるため、保存する値にも同じ制約を適用する。
    const errors = validateInquiry(sanitizedData);
    if (Object.keys(errors).length > 0) return validationErrorResponse(errors);

    // ログイン中ユーザーのIDを取得（監査証跡用、未ログインならnull）
    const session = await auth();
    const userId = session?.user?.id || null;

    // 🔹 DB登録
    const inquiryRecord = await prisma.inquiry.create({
      data: {
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        inquiry: sanitizedData.inquiry,
        userId,
      },
      select: { id: true, createdAt: true },
    });

    // 🔹 メール送信（失敗してもDB登録は成功として扱う）
    try {
      const transporter = getTransporter();
      const adminAddress = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;

      // 🔸 管理者宛メール
      await transporter.sendMail({
        from: `"飾Love お問い合わせフォーム" <${process.env.SMTP_USER}>`,
        to: adminAddress,
        subject: `【飾Love お問い合わせ】${sanitizedData.name} 様より`,
        html: `
          <h3>新しいお問い合わせがありました。</h3>
          <p><strong>お名前:</strong> ${sanitizedData.name}</p>
          <p><strong>メール:</strong> ${sanitizedData.email}</p>
          <p><strong>電話番号:</strong> ${sanitizedData.phone}</p>
          <p><strong>お問い合わせ内容:</strong><br>${sanitizedData.inquiry}</p>
          <hr />
          <p><small>ID: ${inquiryRecord.id} / ${inquiryRecord.createdAt}</small></p>
        `,
      });

      // 🔸 自動返信メール
      await transporter.sendMail({
        from: `"飾Love" <${process.env.SMTP_USER}>`,
        to: sanitizedData.email,
        subject: "【飾Love・自動返信】お問い合わせありがとうございます",
        html: `
          <p>${sanitizedData.name} 様</p>
          <p>このたびは 飾Love(かざらぶ)へのお問い合わせ、誠にありがとうございます。</p>
          <p>以下の内容で受け付けました。</p>
          <hr />
          <p>${sanitizedData.inquiry}</p>
          <hr />
          <p>２営業日以内に、担当者よりご連絡いたします。</p>
          <p>飾Love(かざらぶ)<br>
          Email: ${CONTACT_EMAIL}<br>
          </p>
        `,
      });
    } catch (emailError) {
      console.error("メール送信エラー（DB登録は完了）:", emailError);
    }

    return successResponse();
  } catch (error) {
    console.error("問い合わせ処理エラー:", error);
    return NextResponse.json(
      { success: false, error: "送信・登録処理に失敗しました。" },
      { status: 500 }
    );
  }
}

/**
 * ✅ 問い合わせ一覧取得（認証必須）
 */
export async function GET(req: NextRequest) {
  try {
    // 認証・権限チェック（ADMINのみ）
    const session = await requireAdmin();
    if (isErrorResponse(session)) return session;

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        select: {
          id: true,
          createdAt: true,
          name: true,
          email: true,
          phone: true,
          inquiry: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.inquiry.count(),
    ]);
    return NextResponse.json({ inquiries, total, page, limit });
  } catch (error) {
    return handleApiError(error, { log: "問い合わせ取得エラー", message: "問い合わせ一覧の取得に失敗しました" });
  }
}

/**
 * ✅ 問い合わせ削除（ADMIN必須）
 */
export async function DELETE(req: NextRequest) {
  return deleteManagedResource(req, {
    deleteById: (id) => prisma.inquiry.delete({ where: { id }, select: { id: true } }),
    notFoundMessage: "指定された問い合わせが見つかりません",
    errorLog: "問い合わせ削除エラー",
    errorMessage: "削除に失敗しました",
  });
}
