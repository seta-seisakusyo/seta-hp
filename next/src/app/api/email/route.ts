import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/db";
import { successResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseJsonWithSchema,
  requireAdmin,
} from "@/lib/api-utils";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { InquiryStoredSchema, type InquiryStoredInput } from "@/lib/validation";
import { deleteManagedResource } from "@/lib/managed-resource-route";
import { NextRequest, NextResponse } from "next/server";
import { parsePagination } from "@/lib/pagination";
import { sendInquiryAutoReply, sendInquiryNotification, type InquiryMail } from "@/lib/mailer";
import { isRecaptchaEnabled } from "@/lib/runtime-config";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

const prisma = getPrismaClient();

/**
 * reCAPTCHA検証（有効時のみ、送信処理と同一ハンドラ内で実施）。
 * フォームUIを経由しない /api/email への直接POSTでスパム・任意宛先への自動返信送信
 * （踏み台化）を防ぐため、チャレンジ通過をこのハンドラ内で必須化する。
 */
async function verifyContactRecaptcha(token: unknown): Promise<NextResponse | null> {
  if (!isRecaptchaEnabled()) return null;
  const verification = await verifyRecaptchaToken(token, "contact_form");
  if (verification.success) return null;
  return NextResponse.json(
    { success: false, error: "reCAPTCHA 検証に失敗しました。" },
    { status: verification.status >= 500 ? 500 : 400 }
  );
}

/** DB登録。ログイン中ならユーザーIDを監査証跡として残す（未ログインならnull）。 */
async function storeInquiry({ name, email, phone, inquiry }: InquiryStoredInput): Promise<InquiryMail> {
  const data = { name, email, phone, inquiry };
  const session = await auth();
  const record = await prisma.inquiry.create({
    data: { ...data, userId: session?.user?.id || null },
    select: { id: true, createdAt: true },
  });
  return { ...data, ...record };
}

/** 管理者宛と自動返信の2通を送る。失敗（SMTP_USER 未設定を含む）してもDB登録は成功として扱う。 */
async function sendInquiryMails(inquiry: InquiryMail): Promise<void> {
  try {
    await sendInquiryNotification(inquiry);
    await sendInquiryAutoReply(inquiry);
  } catch (emailError) {
    console.error("メール送信エラー（DB登録は完了）:", emailError);
  }
}

/**
 * ✅ 問い合わせ登録（メール送信 + DB保存）
 */
export async function POST(req: NextRequest) {
  try {
    const { limited } = await enforceRateLimit(req, "contact", RATE_LIMITS.contact);
    if (limited) return limited;

    // 型・文字数の検証、サニタイズ、サニタイズ後の文字数の検証を1回で行う
    const inquiryData = await parseJsonWithSchema(req, InquiryStoredSchema, "fields");
    if (isErrorResponse(inquiryData)) return inquiryData;

    const recaptchaError = await verifyContactRecaptcha(inquiryData.recaptchaToken);
    if (recaptchaError) return recaptchaError;

    const inquiry = await storeInquiry(inquiryData);
    await sendInquiryMails(inquiry);

    return successResponse();
  } catch (error) {
    return handleApiError(error, { log: "問い合わせ処理エラー", message: "送信・登録処理に失敗しました。" });
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
