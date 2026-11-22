import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { decideManageAccess } from "@/lib/manage-routes";

/**
 * 管理ページの多層防御の第2層（#248, #405）。
 * ページ側の requireEditorPage / requireAdminPage と同じ判定を、ページ描画前に行う。
 *
 * Edge ランタイムで動くため、DB を使わない共通設定（auth.config.ts）だけで NextAuth を作り、
 * セッション Cookie の JWT を読んで判定する。判定の中身は MANAGE_ROUTES（manage-routes.ts）。
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const decision = decideManageAccess(req.nextUrl.pathname, req.auth);
  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, req.nextUrl));
  }
});

// Next.js は matcher を静的に解析するため、MANAGE_ROUTES から組み立てられない。
// 表との一致は src/__tests__/middleware.test.ts で確認している。
export const config = {
  matcher: [
    "/products-manage/:path*",
    "/gallery-manage/:path*",
    "/news/:path*",
    "/x-post/:path*",
  ],
};
