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

// ---------------------------------------------------------------------------
// 本文の文字数の数え方（X と同じ重み付き文字数）
//
// twitter-text v3（github.com/twitter/twitter-text の config/v3.json）の設定:
//   maxWeightedTweetLength 280 / scale 100 / defaultWeight 200 /
//   transformedURLLength 23 / emojiParsingEnabled true
//   weight 100 の範囲: U+0000–U+10FF, U+2000–U+200D, U+2010–U+201F, U+2032–U+2037
// つまり ラテン文字・記号などは1、日本語（CJK）などそれ以外は2、絵文字は
// 結合列（肌色・ZWJ・国旗など）全体で2、URL は長さによらず23。
// 本文は NFC 正規化してからコードポイント単位で数える。
//
// 簡略化している点（twitter-text の完全移植ではない）:
// - URL は http:// / https:// で始まるものだけを数える。twitter-text は
//   "example.com" のようなスキームなしのドメインも URL として扱うが、ここでは
//   通常の文字として数える（その場合は X より多めに数えるので、上限を超えて
//   X に拒否される方向には外れない）。
// - 絵文字の判定は twemoji の正規表現ではなく Unicode の
//   Extended_Pictographic プロパティで行う。
// ---------------------------------------------------------------------------

const X_SCALE = 100;
const X_DEFAULT_WEIGHT = 200;
const X_TRANSFORMED_URL_LENGTH = 23;
const X_WEIGHT_RANGES: ReadonlyArray<readonly [number, number, number]> = [
  [0x0000, 0x10ff, 100],
  [0x2000, 0x200d, 100],
  [0x2010, 0x201f, 100],
  [0x2032, 0x2037, 100],
];

/** URL に含めてよい文字（ASCII の URL 文字）。日本語が続けばそこで URL は終わる。 */
const URL_SOURCE = String.raw`https?:\/\/[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::\d+)?(?:[/?#][A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*)?`;

/** 絵文字1つ分（結合列を含む）。 */
const EMOJI_SOURCE = [
  // キーキャップ（1 + U+FE0F + U+20E3 など）
  String.raw`[#*0-9]\u{FE0F}?\u{20E3}`,
  // 国旗（地域指示記号2つ）
  String.raw`\p{Regional_Indicator}{2}`,
  // サブディビジョン旗（🏴 + タグ文字 + 終端タグ）
  String.raw`\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}`,
  // 通常の絵文字。肌色・異体字セレクタ・ZWJ による結合を1つにまとめる
  String.raw`\p{Extended_Pictographic}(?:\u{FE0F}|\p{Emoji_Modifier})*(?:\u{200D}\p{Extended_Pictographic}(?:\u{FE0F}|\p{Emoji_Modifier})*)*`,
  // 単独の肌色修飾
  String.raw`\p{Emoji_Modifier}`,
].join("|");

const TOKEN_PATTERN = new RegExp(`(${URL_SOURCE})|(?:${EMOJI_SOURCE})`, "gu");

/** URL の末尾に付いた句読点は URL に含めない（twitter-text と同様）。 */
const URL_TRAILING_PUNCTUATION = /[.,!?:;'"]+$/;

function codePointWeight(codePoint: number): number {
  for (const [start, end, weight] of X_WEIGHT_RANGES) {
    if (codePoint >= start && codePoint <= end) return weight;
  }
  return X_DEFAULT_WEIGHT;
}

function plainTextWeight(segment: string): number {
  let total = 0;
  for (const ch of segment) {
    total += codePointWeight(ch.codePointAt(0)!);
  }
  return total;
}

/**
 * X の数え方での本文の文字数（重み付き文字数）。X_POST_MAX_LENGTH と比べて使う。
 * 例: "a" → 1、"あ" → 2、絵文字 → 2、URL → 23。
 */
export function xWeightedLength(text: string): number {
  const normalized = text.normalize("NFC");
  let weighted = 0;
  let cursor = 0;
  const pattern = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized)) !== null) {
    let token = match[0];
    const start = match.index;
    weighted += plainTextWeight(normalized.slice(cursor, start));
    if (match[1] !== undefined) {
      token = token.replace(URL_TRAILING_PUNCTUATION, "");
      weighted += X_TRANSFORMED_URL_LENGTH * X_SCALE;
    } else {
      weighted += X_DEFAULT_WEIGHT;
    }
    cursor = start + token.length;
    pattern.lastIndex = cursor;
  }
  weighted += plainTextWeight(normalized.slice(cursor));
  return Math.ceil(weighted / X_SCALE);
}
