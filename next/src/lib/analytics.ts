/**
 * Googleアナリティクス4 の測定ID を検証する (#128)。
 *
 * 測定IDは gtag の初期化インラインスクリプトに文字列として埋め込まれる。
 * 環境変数の設定ミスや意図しない文字列がそのままスクリプトへ入らないよう、
 * GA4 の形式に一致するものだけを通す。
 */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export function resolveGaMeasurementId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return GA_MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed : null;
}
