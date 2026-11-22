export const SITE_URL = "https://kaza-love.com";

export const SITE_NAME = "飾Love";

/** ブランド名の読み */
export const SITE_NAME_READING = "かざらぶ";

/** 読み付きのブランド表記（法務ページ・会社情報などで使う） */
export const SITE_NAME_WITH_READING = `${SITE_NAME}(${SITE_NAME_READING})`;

/** トップページの題名、かつ題名を指定しないページの既定の題名 */
export const SITE_DEFAULT_TITLE = `${SITE_NAME} | MLBカード・トレカを美しく飾る`;

export const CONTACT_EMAIL = "info@kaza-love.com";

export const X_PROFILE_URL = "https://x.com/kaza_love_";

/** X のアカウント名（"@" 付き）。X_PROFILE_URL の末尾から作る。 */
export const X_HANDLE = `@${X_PROFILE_URL.replace(/\/+$/, "").split("/").pop()}`;

/** X の投稿 ID から投稿の URL を作る。 */
export function getXPostUrl(postId: string): string {
  return `${X_PROFILE_URL.replace(/\/+$/, "")}/status/${encodeURIComponent(postId)}`;
}

/** サイト全体の説明文。トップページ・OG の既定値・Organization の構造化データで共通 */
export const SITE_DESCRIPTION =
  "MLB・野球カードコレクターのためのアクリルディスプレイ工房。大谷翔平 AWARD HISTORY 風の壁面展示をはじめ、レーザー加工で一つ一つ丁寧に製作。";

// SNS 共有時の既定のプレビュー画像（1200×630）。画像を差し替えるときはファイル名も変える
// （Nginx の長期キャッシュと X のカードキャッシュで古い画像が出続けるため）。
export const DEFAULT_OG_IMAGE = "/og-kaza-love.png";

export const LOGO_PATH = "/kaza-love_logo.png";

export const FAVICON_PATH = "/kaza-love_favicon.png";

/** フッターの著作権表記の名義 */
export const COPYRIGHT_NAME = SITE_NAME;

/**
 * 運営事業者の情報。会社情報・特商法・プライバシーポリシーで共通に使う。
 * サイト表示のブランドは飾Love、法的表記の販売業者・運営事業者は瀬田製作所。
 */
export const OPERATOR_INFO = {
  /** 屋号 */
  name: "瀬田製作所",
  /** 屋号＋事業形態（表の「販売業者」「屋号」欄） */
  legalName: "瀬田製作所(個人事業所)",
  /** 運営責任者（代表者）。姓と名の間は半角スペース */
  representative: "伊藤 竜次",
  /** 所在地・電話番号を公開していない旨の文言（表では先頭に「※」を付ける） */
  disclosedOnRequest: "ご請求いただいた方にお知らせいたします",
} as const;

/** 受注生産品の発送時期の案内（商品詳細・配送について・特商法で共通） */
export const MADE_TO_ORDER_SHIPPING_NOTE =
  "受注生産のため、発送日はご注文後にメールでご連絡いたします。";
