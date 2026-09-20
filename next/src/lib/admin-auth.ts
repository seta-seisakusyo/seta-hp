import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { isAdminRole, isEditorRole } from "@/lib/roles";

/**
 * 管理ページ共通の認証ガード。
 * 未ログインは /login へ、ADMIN/EDITOR 以外はトップへリダイレクトする。
 */
export async function requireAdminOrEditor(): Promise<Session> {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!isEditorRole(session.user.role)) {
    redirect("/");
  }

  return session;
}

/**
 * ADMIN 限定ページのガード。
 * EDITOR にも見せたくない操作（外部サービスへの発信など）で使う。
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/");
  }

  return session;
}
