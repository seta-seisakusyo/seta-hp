import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site-config";
import LegalPageLayout from "../_legal/LegalPageLayout";
import LegalInfoTable, { LegalInfoRow } from "../_legal/LegalInfoTable";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "飾Love(運営: 瀬田製作所)の特定商取引法に基づく表記です。",
  alternates: { canonical: "/legal" },
};

const ROWS: LegalInfoRow[] = [
  { label: "サイト名", value: "飾Love(かざらぶ)" },
  { label: "販売業者", value: "瀬田製作所(個人事業所)" },
  { label: "運営責任者", value: "木村竜次" },
  { label: "所在地", value: "※ご請求いただいた方にお知らせいたします" },
  { label: "電話番号", value: "※ご請求いただいた方にお知らせいたします" },
  { label: "メールアドレス", value: CONTACT_EMAIL },
  { label: "販売価格", value: "各商品ページに記載" },
  {
    label: "商品代金以外の必要料金",
    value:
      "送料: 全国一律2,000円(税込)\n商品代金の合計が10,000円(税込)以上の場合は無料\n上記以外の追加費用はかかりません。",
  },
  { label: "支払方法", value: "クレジットカード、コンビニ決済、銀行振込" },
  {
    label: "支払時期",
    value: "クレジットカード: ご注文時\nコンビニ決済・銀行振込: ご注文後7日以内",
  },
  {
    label: "商品の引渡時期",
    value:
      "ご注文確認後、通常3〜7営業日以内に発送\n※受注生産品は商品ページに記載の日数",
  },
  {
    label: "返品・交換について",
    value:
      "商品到着後7日以内にご連絡ください。\n・お客様都合の返品: 未開封・未使用に限り可(送料はお客様負担)\n・不良品・誤配送: 送料当店負担で交換または返金",
  },
  {
    label: "返品送料",
    value: "お客様都合: お客様負担\n不良品・誤配送: 当店負担",
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
