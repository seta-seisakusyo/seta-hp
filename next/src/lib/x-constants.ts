/**
 * X (旧Twitter) 投稿の共有定数。
 *
 * x-client.ts は "server-only" のため、クライアント側でも使う
 * バリデーション（validation.ts）や管理UIからは参照できない。
 * 両方から使う値だけをこのモジュールに切り出す。
 */

/** 標準アカウントの本文上限。 */
export const X_POST_MAX_LENGTH = 280;

/** 1投稿に添付できる画像の上限（X の仕様）。 */
export const X_POST_MAX_IMAGES = 4;
