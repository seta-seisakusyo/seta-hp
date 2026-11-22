import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { isAdminRole, isEditorRole } from "@/lib/roles";

// 管理ページ（Server Component）用の認可。API 用の requireAdmin / requireEditor（api-utils.ts）は
// 応答を返すのに対し、こちらはリダイレクトする。middleware（MANAGE_ROUTES）と同じ判定にそろえる。

async function requirePageRole(isAllowed: (role: unknown) => boolean): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAllowed(session.user.role)) redirect("/");
  return session;
}

/** 未ログインは /login へ、ADMIN/EDITOR 以外はトップへリダイレクトする。 */
export function requireEditorPage(): Promise<Session> {
  return requirePageRole(isEditorRole);
}

/** 外部サービスへの発信など、ADMIN 限定ページの認証ガード。 */
export function requireAdminPage(): Promise<Session> {
  return requirePageRole(isAdminRole);
}
