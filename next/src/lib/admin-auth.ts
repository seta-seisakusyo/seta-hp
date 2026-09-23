import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { isAdminRole, isEditorRole } from "@/lib/roles";

async function requirePageRole(isAllowed: (role: unknown) => boolean): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAllowed(session.user.role)) redirect("/");
  return session;
}

/** 未ログインは /login へ、ADMIN/EDITOR 以外はトップへリダイレクトする。 */
export function requireAdminOrEditor(): Promise<Session> {
  return requirePageRole(isEditorRole);
}

/** 外部サービスへの発信など、ADMIN 限定ページの認証ガード。 */
export function requireAdmin(): Promise<Session> {
  return requirePageRole(isAdminRole);
}
