// src/lib/auth.config.ts
//
// middleware（Edge ランタイム）からも読み込む Auth.js の共通設定（#405）。
// ここには DB・bcryptjs・レート制限など Node 専用のものを import しない。
// プロバイダーの authorize、PrismaAdapter、DB を引く callback は src/lib/auth.ts に置く。
//
// セッション Cookie の名前・ドメイン・有効期限はここで一度だけ決め、middleware と
// 本体の両方が同じ値を使う。食い違うと middleware がセッションを読めず、
// ログイン済みでも管理ページがすべてログインへ飛ばされる。
import type { NextAuthConfig } from "next-auth";
import { normalizeUserRole } from "@/lib/roles";

// --- SSO: クロスサブドメインで NextAuth セッション Cookie を共有するための設定 ---
// 別アプリ（飾Love Designer = designer.kaza-love.com 等）を HP のログインでゲートする際、
// Cookie を親ドメイン（.kaza-love.com）まで広げて両ホストへ送れるようにする。
// SSO_COOKIE_DOMAIN が未設定なら cookies 設定自体を出さず、NextAuth デフォルト
// （HostOnly Cookie）のまま＝本番挙動は不変（既定 OFF）。
const ssoCookieDomain = process.env.SSO_COOKIE_DOMAIN?.trim() || undefined;
// secure は既定で本番(NODE_ENV=production)のみ true。ローカル http PoC では SSO_COOKIE_SECURE=0。
const ssoCookieSecure =
  process.env.SSO_COOKIE_SECURE !== undefined
    ? process.env.SSO_COOKIE_SECURE === "1"
    : process.env.NODE_ENV === "production";

const ssoCookies = ssoCookieDomain
  ? {
      cookies: {
        sessionToken: {
          // ★既定名(authjs.session-token)とは別名にする。
          // 既存ユーザーが持つ HostOnly な authjs.session-token と「同名・別スコープ」で
          // 共存すると Cookie ヘッダが二重になりセッションが壊れるため、SSO用は独立した名前に。
          // 移行時は旧Cookieとは別物として扱われ、ユーザーは一度だけ再ログイン→新Cookie発行。
          // __Host- は Domain 禁止のため使わない。secure時のみ __Secure- 接頭辞を付ける。
          name: ssoCookieSecure
            ? "__Secure-kazalove.session-token"
            : "kazalove.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
            domain: ssoCookieDomain,
            secure: ssoCookieSecure,
          },
        },
      },
    }
  : {};

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  jwt: { maxAge: 24 * 60 * 60 },
  ...ssoCookies,
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  // ログイン手段は src/lib/auth.ts で加える（middleware はセッションを読むだけ）。
  providers: [],
  callbacks: {
    // JWT → session の対応づけ。DB を使わないので middleware でもそのまま動く。
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = normalizeUserRole(token.role);
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
