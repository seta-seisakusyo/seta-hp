import { NextResponse, NextRequest } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isErrorResponse, parseJsonWithSchema } from "@/lib/api-utils";
import { successResponse } from "@/lib/api-response";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { RecaptchaRequestSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  // レート制限チェック
  const { limited } = await enforceRateLimit(req, "recaptcha", RATE_LIMITS.recaptcha);
  if (limited) return limited;

  const body = await parseJsonWithSchema(req, RecaptchaRequestSchema);
  if (isErrorResponse(body)) return body;
  const { token, expectedAction } = body;

  const verification = await verifyRecaptchaToken(token, expectedAction);
  if (!verification.success) {
    return NextResponse.json(
      { success: false, message: verification.message ?? "reCAPTCHA 検証に失敗しました。" },
      { status: verification.status }
    );
  }

  return successResponse();
}
