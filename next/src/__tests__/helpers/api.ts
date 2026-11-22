import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

export type TestRole = "ADMIN" | "EDITOR" | "VIEWER";

/** auth() が返すセッション。null は未ログイン。 */
export function sessionFor(role: TestRole | null) {
  if (!role) return null;
  const name = role.toLowerCase();
  return { user: { id: `user-${name}`, email: `${name}@example.com`, role } };
}

/**
 * 権限テストの4通り（未ログイン・VIEWER・EDITOR・ADMIN）。
 * required 以上なら allowed、未ログインは 401、権限不足は 403。
 */
export function roleCases(required: "EDITOR" | "ADMIN") {
  const allowed = (role: TestRole) => role === "ADMIN" || (required === "EDITOR" && role === "EDITOR");
  return [
    { label: "未ログイン", role: null, allowed: false, status: 401 },
    ...(["VIEWER", "EDITOR", "ADMIN"] as const).map((role) => ({
      label: role,
      role,
      allowed: allowed(role),
      status: allowed(role) ? 200 : 403,
    })),
  ] as Array<{ label: string; role: TestRole | null; allowed: boolean; status: number }>;
}

/** JSON 本文付きのリクエスト。body が undefined なら本文なし。 */
export function jsonRequest(url: string, method = "POST", body?: unknown, headers?: HeadersInit) {
  return new NextRequest(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Prisma の既知エラー（P2025 / P2002 など）。 */
export function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: "test" });
}
