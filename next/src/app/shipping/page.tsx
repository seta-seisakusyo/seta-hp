import type { Metadata } from "next";
import LegalPageLayout from "../_legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "配送・返品について",
  description:
    "飾Love の配送方法・お届け日数・返品についてご案内します。商品は BASE または Amazon からご購入いただけます。",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <LegalPageLayout
      titleJa="配送・返品について"
      titleEn="Shipping & Returns"
      eyebrow="Shipping · 配送について"
    >
      <h2>ご購入について</h2>
      <p>
        商品は <strong>BASE</strong> または <strong>Amazon</strong> の販売ページからご購入いただけます。
        本サイト上でのご注文・お支払いは行っておりません。各商品ページの購入ボタンから、販売サイトへお進みください。
      </p>

      <h2>配送方法</h2>
      <p>
        ゆうパック、クリックポスト、レターパックのいずれかでお届けします。
        商品のサイズ・数量に応じて最適な配送方法を選択いたします。
      </p>

      <h2>送料</h2>
      <p>
        送料は、ご購入いただく販売サイト（BASE・Amazon）の商品ページ・購入画面に表示されます。
      </p>

      <h2>お届け日数</h2>
      <p>
        ご注文確認後、通常 3〜7 営業日以内に発送いたします。
        受注生産品の場合は、商品ページに記載の日数をご確認ください。
      </p>

      <h2>返品・交換</h2>
      <p>
        返品・交換・返金は、ご購入いただいた販売サイト（BASE・Amazon）の返品ポリシーに従います。
        お手続きは各販売サイトからお願いいたします。
      </p>
    </LegalPageLayout>
  );
}
