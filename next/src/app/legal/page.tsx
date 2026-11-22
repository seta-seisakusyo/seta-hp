import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  MADE_TO_ORDER_SHIPPING_NOTE,
  OPERATOR_INFO,
  SITE_NAME,
  SITE_NAME_WITH_READING,
} from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import LegalPageLayout from "../_legal/LegalPageLayout";
import LegalInfoTable, { LegalInfoRow } from "../_legal/LegalInfoTable";

export const metadata: Metadata = buildPageMetadata({
  title: "特定商取引法に基づく表記",
  description: `${SITE_NAME}(運営: ${OPERATOR_INFO.name})の特定商取引法に基づく表記です。`,
  path: "/legal",
});

const ROWS: LegalInfoRow[] = [
  { label: "サイト名", value: SITE_NAME_WITH_READING },
  { label: "販売業者", value: OPERATOR_INFO.legalName },
  { label: "運営責任者", value: OPERATOR_INFO.representative },
  { label: "所在地", value: `※${OPERATOR_INFO.disclosedOnRequest}` },
  { label: "電話番号", value: `※${OPERATOR_INFO.disclosedOnRequest}` },
  { label: "メールアドレス", value: CONTACT_EMAIL },
  {
    label: "販売方法",
    value:
      "商品は BASE または Amazon の販売ページからご購入いただけます。\n本サイト上でのご注文・お支払いは行っておりません。",
  },
  { label: "販売価格", value: "各商品ページに記載" },
  {
    label: "商品代金以外の必要料金",
    value: "送料は、各販売サイト（BASE・Amazon）の商品ページ・購入画面に表示されます。",
  },
  { label: "支払方法", value: "各販売サイト（BASE・Amazon）でご利用いただける支払方法に準じます。" },
  { label: "支払時期", value: "各販売サイト（BASE・Amazon）の定めに準じます。" },
  {
    label: "商品の引渡時期",
    value: `${MADE_TO_ORDER_SHIPPING_NOTE}\n※お急ぎの場合は、ご注文前にお問い合わせください`,
  },
  {
    label: "返品・交換について",
    value:
      "ご購入いただいた販売サイト（BASE・Amazon）の返品ポリシーに従います。\n返品・交換・返金のお手続きは、各販売サイトからお願いいたします。",
  },
];

export default function LegalPage() {
  return (
    <LegalPageLayout
      titleJa="特定商取引法に基づく表記"
      titleEn="Specified Commercial Transactions Act"
      eyebrow="Terms · 特商法"
    >
      <p>
        特定商取引法に基づき、以下の事項を表記いたします。
        ご購入前に必ずご確認ください。
      </p>
      <LegalInfoTable rows={ROWS} />
    </LegalPageLayout>
  );
}
