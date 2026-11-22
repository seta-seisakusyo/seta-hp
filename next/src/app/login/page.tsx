import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { isGoogleAuthEnabled } from "@/lib/runtime-config";
import LoginForm from "./LoginForm";

export const metadata: Metadata = buildPageMetadata({
  title: "ログイン",
  path: "/login",
  noindex: true,
});

export default async function LoginPage() {
  const session = await auth();

  // ログイン済みの場合はホームへリダイレクト
  if (session) {
    redirect("/");
  }

  const googleAuthEnabled = isGoogleAuthEnabled();

  return (
    <AuthPageShell>
        <LoginForm isGoogleEnabled={googleAuthEnabled} />
    </AuthPageShell>
  );
}
