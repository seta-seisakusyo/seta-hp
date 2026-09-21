import type { Metadata } from "next";
import LegalPageLayout from "../_legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "配送・返品について",
  description:
    "飾Love の配送方法・送料・返品ポリシーをご案内します。送料は全国一律2,000円、10,000円(税込)以上のご購入で無料です。",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <LegalPageLayout
      titleJa="配送・返品について"
      titleEn="Shipping & Returns"
      eyebrow="Shipping · 配送について"
    >
      <h2>配送方法</h2>
      <p>
        ゆうパック、クリックポスト、レターパックのいずれかでお届けします。
        商品のサイズ・数量に応じて最適な配送方法を選択いたします。
      </p>

      <h2>送料</h2>
      <p>
        <strong>全国一律 2,000 円(税込)</strong>です。お届け先の地域や商品の大きさによる違いはありません。
      </p>
      <p>
        商品代金の合計が <strong>10,000 円(税込)以上</strong>の場合、送料は無料です。
      </p>

      <h2>お届け日数</h2>
      <p>
        ご注文確認後、通常 3〜7 営業日以内に発送いたします。
        受注生産品の場合は、商品ページに記載の日数をご確認ください。
      </p>

      <h2>返品・交換</h2>

      <h3>返品・交換の条件</h3>
      <p>商品到着後 7 日以内にメールにてご連絡ください。</p>

      <h3>お客様都合の返品</h3>
      <p>
        未開封・未使用の商品に限り、返品をお受けいたします。返送料はお客様のご負担となります。
        ※ 受注生産品・オーダーメイド品は返品をお受けできません。
      </p>

      <h3>不良品・誤配送の場合</h3>
      <p>
        商品に不良があった場合、または誤った商品が届いた場合は、
        送料当店負担にて交換または返金いたします。商品到着後 7 日以内にご連絡ください。
      </p>

      <h3>返金方法</h3>
      <p>
        ご返金はお支払い方法に応じて行います。
        クレジットカードの場合はカード会社経由、銀行振込の場合はご指定の口座へお振込みいたします。
      </p>
    </LegalPageLayout>
  );
}
