import { isAdminRole, isEditorRole } from "@/lib/roles";

/**
 * 管理ページと、開くのに必要な権限の一覧（#405）。
 * middleware（src/middleware.ts）はこの表で判定する。
 *
 * 管理ページを増やすときは次もあわせて直す（テストで照合している箇所あり）。
 * - src/middleware.ts の config.matcher（Next.js の制約で静的なリテラルしか書けない）
 * - nginx/docker-entrypoint.sh の管理エリアの location（IP 制限）
 * - ページ側の requireEditorPage / requireAdminPage
 */
export const MANAGE_ROUTES = [
  { path: "/products-manage", role: "EDITOR" },
  { path: "/gallery-manage", role: "EDITOR" },
  { path: "/news", role: "EDITOR" },
  // 取り消せない外部への発信なので ADMIN のみ
  { path: "/x-post", role: "ADMIN" },
] as const satisfies readonly { path: string; role: "ADMIN" | "EDITOR" }[];

export type ManageRoute = (typeof MANAGE_ROUTES)[number];

/** EDITOR 指定は ADMIN も含む。 */
const ROLE_CHECKS = {
  ADMIN: isAdminRole,
  EDITOR: isEditorRole,
} as const;

export function findManageRoute(pathname: string): ManageRoute | undefined {
  return MANAGE_ROUTES.find(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`)
  );
}

export type ManageAccessDecision =
  | { type: "allow" }
  | { type: "redirect"; to: "/login" | "/" };

/**
 * 管理ページへのアクセス可否。未ログインはログインへ、権限不足はトップへ。
 * 表にないパスは判定しない（allow）。
 */
export function decideManageAccess(
  pathname: string,
  session: { user?: { role?: unknown } | null } | null | undefined
): ManageAccessDecision {
  const route = findManageRoute(pathname);
  if (!route) return { type: "allow" };
  if (!session?.user) return { type: "redirect", to: "/login" };
  if (!ROLE_CHECKS[route.role](session.user.role)) return { type: "redirect", to: "/" };
  return { type: "allow" };
}
