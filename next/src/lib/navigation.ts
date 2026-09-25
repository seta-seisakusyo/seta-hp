/** ヘッダー・スマホメニューの主要導線 */
export const NAV_LINKS = [
  { label: "カタログ", href: "/products" },
  { label: "ギャラリー", href: "/gallery" },
  { label: "お問い合わせ", href: "/contact" },
] as const;

/** フッター・スマホメニューの規約・会社情報リンク */
export const POLICY_LINKS = [
  { label: "配送について", href: "/shipping" },
  { label: "特定商取引法", href: "/legal" },
  { label: "プライバシー", href: "/privacy-policy" },
  { label: "会社情報", href: "/company" },
] as const;
