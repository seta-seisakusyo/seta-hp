import Script from "next/script";
import { resolveGaMeasurementId } from "@/lib/analytics";

/**
 * Googleアナリティクス4 (GA4) の読み込み (#128)。
 *
 * 測定IDが未設定・不正な形式なら何も描画しない。ローカル開発やプレビューで
 * 本番の計測を汚さないよう、環境変数を入れた環境だけで有効になる。
 *
 * SPA遷移のページビューは GA4 の「拡張計測機能 > ブラウザの履歴イベントに基づくページの変更」
 * が既定で有効なため、App Router のクライアント遷移も追加実装なしで計測される。
 * 手動で router イベントを拾うと二重計測になるので入れていない。
 */
const measurementId = resolveGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

const Analytics = () => {
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`}
      </Script>
    </>
  );
};

export default Analytics;
