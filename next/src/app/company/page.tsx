import type { Metadata } from "next";
import { CONTACT_EMAIL, OPERATOR_INFO, SITE_NAME, SITE_NAME_WITH_READING } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import LegalPageLayout from "../_legal/LegalPageLayout";
import LegalInfoTable, { LegalInfoRow } from "../_legal/LegalInfoTable";

export const metadata: Metadata = buildPageMetadata({
  title: "会社情報",
  description: `${SITE_NAME_WITH_READING}は、小さな個人工房から、MLBカード・トレカコレクター向けのハンドメイドアクリルディスプレイをお届けする新ブランドです。運営は個人事業所「${OPERATOR_INFO.name}」。`,
  path: "/company",
});

const ROWS: LegalInfoRow[] = [
  { label: "ブランド名 / Brand", value: SITE_NAME_WITH_READING },
  { label: "屋号 / Legal Name", value: OPERATOR_INFO.legalName },
  { label: "所在地 / Location", value: `※${OPERATOR_INFO.disclosedOnRequest}` },
  { label: "設立 / Founded", value: "2023年8月8日" },
  {
    label: "事業内容 / Business",
    value:
      `ハンドメイドアクリルディスプレイの製造販売(${SITE_NAME})`,
  },
  { label: "Email", value: CONTACT_EMAIL },
];

export default function CompanyPage() {
  return (
    <LegalPageLayout
      titleJa="会社情報"
      titleEn="Company"
      eyebrow="Company · 飾Love について"
    >
      <p>
        <strong>{SITE_NAME_WITH_READING}</strong> は、小さな個人工房から、
        MLBカード・トレカコレクターのための、ハンドメイドアクリルディスプレイをお届けする新ブランドです。
        レーザー加工で、ひとつずつ丁寧に製作しています。
      </p>
      <p>
        飾Love の運営事業者は、個人事業所「<strong>{OPERATOR_INFO.name}</strong>」です。
        個人事業所の屋号として「{OPERATOR_INFO.name}」を登録しており、新ブランド「飾Love」として
        アクリルディスプレイの製造販売事業を行っています。
      </p>
      <LegalInfoTable rows={ROWS} />
    </LegalPageLayout>
  );
}
