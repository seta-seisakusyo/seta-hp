import type { Metadata } from "next";
import { ReCaptchaProvider } from "next-recaptcha-v3";
import ContactForm from "./ContactForm";
import { Box } from "@mui/material";
import { auth } from "@/lib/auth";
import PageHero from "@/components/PageHero";
import { isRecaptchaEnabled } from "@/lib/runtime-config";
import { isAdminRole } from "@/lib/roles";
import InquiryManagement from "./InquiryManagement";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "お問い合わせ",
  description:
    "飾Loveへのお問い合わせはこちらから。商品に関するご質問やオーダーメイド、MLBカード・トレカ用アクリルディスプレイの特注相談など、お気軽にどうぞ。",
  path: "/contact",
});

export default async function ContactPage() {
  // Todo: middleware若しくはauth.ts(config含む)にて同様の設定が可能、かつパフォーマンス向上が期待できるため、今後改修予定
  const session = await auth();
  const isAdmin = isAdminRole(session?.user?.role);
  const recaptchaEnabled = isRecaptchaEnabled();

  return (
    <Box>
      <PageHero
        variant="contact"
        eyebrow="Contact · お問い合わせ"
        heading={isAdmin ? "問い合わせ管理" : "お問い合わせ"}
        subtitle={<>— {isAdmin ? "Inquiry Management" : "Inquiry"}</>}
        description={
          isAdmin
            ? "受信したお問い合わせの一覧と対応状況を管理します。"
            : "商品に対する質問、カスタム対応のご相談などお気軽にお問い合わせください。"
        }
      />
      {isAdmin && session ? (
        <InquiryManagement session={session} />
      ) : recaptchaEnabled ? (
        <ReCaptchaProvider
          reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          useRecaptchaNet={true}
        >
          <ContactForm recaptchaEnabled />
        </ReCaptchaProvider>
      ) : (
        <ContactForm recaptchaEnabled={false} />
      )}
    </Box>
  );
}
