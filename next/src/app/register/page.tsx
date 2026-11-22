import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { auth } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/runtime-config";
import { redirect } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = buildPageMetadata({
  title: "新規登録",
  path: "/register",
  noindex: true,
});

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <AuthPageShell>
        <RegisterForm isGoogleEnabled={isGoogleAuthEnabled()} />
    </AuthPageShell>
  );
}
