import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import {
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { isAdminRole, isEditorRole } from "@/lib/roles";
import { getValidationErrors } from "@/lib/validation";

/**
 * 認証と権限をまとめて検証する。
 * 未認証なら401、権限不足なら403のレスポンスを、検証通過ならセッションを返す。
 */
async function requireRole(
  isAllowed: (role: unknown) => boolean,
  forbiddenMessage: string = "権限がありません"
): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }
  if (!isAllowed(session.user.role)) {
    return forbiddenResponse(forbiddenMessage);
  }
  return session;
}

export function requireEditor(): Promise<Session | NextResponse> {
  return requireRole(isEditorRole, "編集権限が必要です");
}

export function requireAdmin(): Promise<Session | NextResponse> {
  return requireRole(isAdminRole, "管理者権限が必要です");
}

/** JSONパースとスキーマ検証を行い、不正な入力は400で返す。 */
export async function parseJsonWithSchema<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  errorFormat: "message" | "fields" = "message"
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse("リクエストボディが不正です");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorFormat === "fields"
      ? validationErrorResponse(getValidationErrors(parsed.error))
      : badRequestResponse(parsed.error.issues[0].message);
  }
  return parsed.data;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

async function parseAuthorizedJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  authorize: () => Promise<Session | NextResponse>
): Promise<z.infer<T> | NextResponse> {
  const session = await authorize();
  if (isErrorResponse(session)) return session;
  return parseJsonWithSchema(req, schema);
}

/** EDITOR以上の認証とJSONスキーマ検証を一度に行う。 */
export function parseEditorJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  return parseAuthorizedJson(req, schema, requireEditor);
}

/** ADMIN認証とJSONスキーマ検証を一度に行う。 */
export function parseAdminJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  return parseAuthorizedJson(req, schema, requireAdmin);
}

/**
 * API ルート共通の catch ハンドラ。
 * - Prisma P2025（更新・削除対象なし） → 404
 * - Prisma P2002（一意制約違反）→ 指定時は既存契約と同じ400
 * - Prisma P2003（外部キー違反。存在しないIDへの紐づけ）→ 指定時は400
 * - その他 → ログ出力して 500
 */
export function handleApiError(
  error: unknown,
  options: {
    log: string;
    message: string;
    notFoundMessage?: string;
    uniqueConstraintMessage?: string;
    foreignKeyMessage?: string;
  }
): NextResponse {
  if (
    options.foreignKeyMessage &&
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return badRequestResponse(options.foreignKeyMessage);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return notFoundResponse(options.notFoundMessage ?? "対象が見つかりません");
  }
  if (
    options.uniqueConstraintMessage &&
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return badRequestResponse(options.uniqueConstraintMessage);
  }
  console.error(`${options.log}:`, error);
  return internalErrorResponse(options.message);
}
