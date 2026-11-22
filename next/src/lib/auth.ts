// Auth.js 本体（Node ランタイム専用）。DB・bcryptjs・レート制限を使う部分はここに置き、
// middleware と共有する部分（Cookie・JWT・pages・JWT→session）は ./auth.config.ts に置く（#405）。
import { getPrismaClient } from "@/lib/db";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { DEFAULT_USER_ROLE } from "@/lib/roles";
import { isGoogleAuthEnabled } from "@/lib/runtime-config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

const prisma = getPrismaClient();

// Google認証が設定されているかチェック
const googleProviderEnabled = isGoogleAuthEnabled();

export const {
  auth,
  handlers: { GET, POST },
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  providers: [
    // Google OAuth（環境変数が設定されている場合のみ有効）
    ...(googleProviderEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // Email/Password認証
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "メールアドレス", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email || "");
        const password = String(credentials?.password || "");

        if (!email || !password) {
          throw new Error("メールアドレス若しくはパスワードが入力されていません。");
        }

        // 単一IPから多数アカウントを試すパスワードスプレー対策（#248）
        const clientIp = getClientIp(request);
        const ipRateLimit = await checkRateLimit(`login-ip:${clientIp}`, RATE_LIMITS.loginIp);
        if (!ipRateLimit.success) {
          throw new Error("ログイン試行回数が上限に達しました。しばらくお待ちください。");
        }

        // 同一アカウントへのパスワード総当たり対策
        const rateLimit = await checkRateLimit(`login:${email}`, RATE_LIMITS.login);
        if (!rateLimit.success) {
          throw new Error("ログイン試行回数が上限に達しました。しばらくお待ちください。");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
          },
        });

        // ユーザー列挙攻撃対策: 存在チェックとパスワードチェックで同じメッセージ
        const invalidCredentialsMsg = "メールアドレスまたはパスワードが正しくありません。";

        if (!user) throw new Error(invalidCredentialsMsg);

        // パスワードがない場合（Google登録ユーザーなど）
        if (!user.password) {
          throw new Error("このアカウントはGoogle認証で登録されています。Googleでログインしてください。");
        }

        const passwordMatch = await bcryptjs.compare(password, String(user.password));
        if (!passwordMatch) throw new Error(invalidCredentialsMsg);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    // Google ログインの User / Account 行は PrismaAdapter が作る（#405）。
    // 以前はここで User を手動 upsert していたが、Account のない User が先にでき、
    // 直後のアダプター処理が同じメールの User を見つけて OAuthAccountNotLinked で失敗していた。

    async jwt({ token, user, account }) {
      // ログイン直後（userが存在する時）
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;

        // Google認証の場合、画像を保存
        if (account?.provider === "google" && user.image) {
          token.picture = user.image;
        }
      }

      // JWTがすでに存在していて、userが無い（後続リクエスト）ときにも
      // roleが入っていなければ再取得して補完
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { role: true, image: true },
        });
        token.role = dbUser?.role ?? DEFAULT_USER_ROLE;
        if (dbUser?.image) {
          token.picture = dbUser.image;
        }
      }

      return token;
    },
  },
});
