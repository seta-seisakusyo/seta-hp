import * as z from "zod";
import xss from "xss";
import { DATABASE_INT_MAX } from "./db-limits";
import {
  VALID_GALLERY_CATEGORIES,
  VALID_PRODUCT_CATEGORIES,
  VALID_STOCK_OPTIONS,
} from "@/lib/constants/categories";
import { X_POST_MAX_IMAGES, X_POST_MAX_LENGTH } from "@/lib/x-constants";
import { WORK_PRODUCTS_MAX } from "@/lib/work-constants";
import { META_DESCRIPTION_MAX, SEO_KEYWORDS_MAX } from "@/lib/seo-keywords";

const nameSchema = z
  .string()
  .min(1, { message: "氏名を入力してください。" })
  .max(50, { message: "氏名は50文字以内で入力してください。" });
const emailSchema = z
  .string()
  .min(1, { message: "メールアドレスを入力してください。" })
  .email({ message: "有効なメールアドレスを入力してください。" });

// 固定電話・携帯電話・空文字（任意入力）に対応する。
const phoneRegex = /^(0[0-9]{1,4}[-]?[0-9]{1,4}[-]?[0-9]{3,4})?$/;

export const InquirySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string()
    .regex(phoneRegex, { message: "有効な電話番号を入力してください。" })
    .optional(),
  inquiry: z
    .string()
    .min(1, { message: "お問い合わせ内容を入力してください。" })
    .max(500, { message: "お問い合わせ内容は500文字以内で入力してください。" }),
});

export const InquirySubmissionSchema = InquirySchema.extend({
  // トークンの型と内容は、有効時のみ verifyRecaptchaToken で検証する。
  recaptchaToken: z.unknown().optional(),
});

export const RecaptchaRequestSchema = z.object({
  token: z.unknown().optional(),
  expectedAction: z.string().optional(),
});

/** フォームとAPIで同じフィールドエラーを返す。各フィールドの先頭エラーを採用する。 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_form");
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function validateInquiry(data: unknown): Record<string, string> {
  const result = InquirySchema.safeParse(data);
  return result.success ? {} : getValidationErrors(result.error);
}

export const RegistrationSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: "パスワードは8文字以上で入力してください。" })
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "パスワードは大文字・小文字・数字をそれぞれ含める必要があります。",
    }),
});

// ---------------------------------------------------------------------------
// 商品・制作事例（管理API用）
// POST/PUT で重複していた手続き的バリデーションを Zod に統一（#245）。
// 保存する文字列へ変換してからDB制約を検証する。ルートで再変換しない。
// ---------------------------------------------------------------------------

const priceSchema = z.coerce
  .number({ invalid_type_error: "価格は0以上の整数を指定してください" })
  .int({ message: "価格は0以上の整数を指定してください" })
  .min(0, { message: "価格は0以上の整数を指定してください" })
  .max(DATABASE_INT_MAX, { message: `価格は${DATABASE_INT_MAX}以下で指定してください` });

const productCategorySchema = z
  .string({ required_error: "カテゴリは必須です" })
  .refine((v) => (VALID_PRODUCT_CATEGORIES as readonly string[]).includes(v), {
    message: `カテゴリは${VALID_PRODUCT_CATEGORIES.join(", ")}のいずれかを指定してください`,
  });

const stockSchema = z
  .string()
  .refine((v) => !v || (VALID_STOCK_OPTIONS as readonly string[]).includes(v), {
    message: `在庫状況は${VALID_STOCK_OPTIONS.join(", ")}のいずれかを指定してください`,
  });

// MySQL の String(VARCHAR(191)) 列に対応する最大長。超過は DB insert 前に 400 で弾く。
const VARCHAR_MAX = 191;

function storedText(requiredMessage: string, lengthMessage?: string) {
  const input = z.string({ required_error: requiredMessage }).min(1, { message: requiredMessage });
  const sanitized = input.transform((value) => xss(value));
  return sanitized.pipe(lengthMessage
    ? z.string().min(1, { message: requiredMessage }).max(VARCHAR_MAX, { message: lengthMessage })
    : z.string().min(1, { message: requiredMessage }));
}


/**
 * http(s) スキームのみを許可するURLスキーマを生成する。
 * `javascript:` や `data:` などのスキームは new URL() では解析が通ってしまうため、
 * protocol を明示的に検査して格納・描画時の XSS（例: <a href="javascript:...">）を防ぐ。
 * allowedHosts を指定すると、そのドメイン（とサブドメイン）以外を拒否する。
 */
function makeHttpUrlSchema(
  message: string,
  { maxLength = VARCHAR_MAX, allowedHosts }: { maxLength?: number; allowedHosts?: readonly string[] } = {}
) {
  return z
    .string()
    .max(maxLength, { message })
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const { protocol, hostname } = new URL(v);
          if (protocol !== "http:" && protocol !== "https:") return false;
          return !allowedHosts ||
            allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
        } catch {
          return false;
        }
      },
      { message }
    )
    .transform((value) => xss(value))
    .pipe(z.string().max(maxLength, { message }))
    .transform((value) => value || null);
}

const purchaseUrlSchema = makeHttpUrlSchema("購入URLは http(s) 形式の有効なURLを指定してください");

// Amazon の商品URLはコピー時にスラッグや追跡パラメータが付いて長くなるため、列を VARCHAR(512) にしている。
export const AMAZON_URL_MAX = 512;
const AMAZON_HOSTS = ["amazon.co.jp", "amazon.com", "amzn.asia", "amzn.to"] as const;
const amazonUrlSchema = makeHttpUrlSchema(
  `AmazonのURLは amazon.co.jp 等の http(s) URL を${AMAZON_URL_MAX}文字以内で指定してください`,
  { maxLength: AMAZON_URL_MAX, allowedHosts: AMAZON_HOSTS }
);

const idSchema = z
  .number({ required_error: "IDは必須です", invalid_type_error: "IDは必須です" })
  .int({ message: "IDは必須です" })
  .positive({ message: "IDは必須です" })
  .max(DATABASE_INT_MAX, { message: "IDが範囲外です" });

const tagsSchema = z.union([z.string(), z.array(z.unknown())])
  .transform((tags) => Array.isArray(tags) ? tags.map((tag) => xss(String(tag))).join(",") : xss(tags))
  .pipe(z.string().max(VARCHAR_MAX, { message: `タグは${VARCHAR_MAX}文字以内で入力してください` }))
  .optional();
const optionalImageSchema = z.string().max(VARCHAR_MAX, { message: "画像URLが長すぎます" }).optional().nullable();

// 検索エンジン向けの項目。空文字は「未設定」(null) として保存する。
const seoKeywordsSchema = z.union([z.string(), z.array(z.unknown())])
  .transform((keywords) => {
    const list = Array.isArray(keywords) ? keywords.map(String) : keywords.split(/[,、，\n]/);
    return [...new Set(list.map((keyword) => xss(keyword.trim())).filter(Boolean))].join(",");
  })
  .pipe(z.string().max(SEO_KEYWORDS_MAX, { message: `SEOキーワードは${SEO_KEYWORDS_MAX}文字以内で入力してください` }))
  .transform((value) => value || null);
const metaDescriptionSchema = z.string()
  .transform((value) => xss(value.trim()))
  .pipe(z.string().max(META_DESCRIPTION_MAX, {
    message: `検索結果の説明文は${META_DESCRIPTION_MAX}文字以内で入力してください`,
  }))
  .transform((value) => value || null);

const sleeveMmSchema = z
  .number({ invalid_type_error: "スリーブの寸法は数値で指定してください" })
  .positive({ message: "スリーブの寸法は0より大きい値にしてください" })
  .max(1000, { message: "スリーブの寸法は1000mm以下にしてください" });

/**
 * 対応スリーブ。商品詳細の「対応スリーブ」欄に表示する。
 * discount は、お客様がスリーブをお持ちで「スリーブなし」を選んだ場合の値引き額（円）。
 */
export const productSleeveSchema = z.object({
  name: storedText("対応スリーブの名前は必須です", `対応スリーブの名前は${VARCHAR_MAX}文字以内で入力してください`),
  maker: z
    .string()
    .transform((value) => xss(value.trim()))
    .pipe(z.string().max(100, { message: "スリーブのメーカーは100文字以内で入力してください" }))
    .transform((value) => value || null)
    .optional()
    .nullable(),
  widthMm: sleeveMmSchema.optional().nullable(),
  heightMm: sleeveMmSchema.optional().nullable(),
  thicknessMm: sleeveMmSchema.optional().nullable(),
  count: z
    .number({ invalid_type_error: "スリーブの枚数は整数で指定してください" })
    .int({ message: "スリーブの枚数は整数で指定してください" })
    .min(1, { message: "スリーブの枚数は1以上にしてください" })
    .max(1000, { message: "スリーブの枚数は1000以下にしてください" })
    .optional()
    .nullable(),
  discount: z
    .number({ invalid_type_error: "値引き額は整数で指定してください" })
    .int({ message: "値引き額は整数で指定してください" })
    .min(0, { message: "値引き額は0以上にしてください" })
    .max(DATABASE_INT_MAX, { message: "値引き額が大きすぎます" })
    .optional()
    .nullable(),
});
export type ProductSleeveInput = z.infer<typeof productSleeveSchema>;
// null は「対応スリーブなし（登録を消す）」、未送信は「変更しない」。
const optionalSleeveSchema = productSleeveSchema.nullable().optional();

export const ProductCreateSchema = z.object({
  name: storedText("名前は必須です", `名前は${VARCHAR_MAX}文字以内で入力してください`),
  description: storedText("説明は必須です"),
  price: priceSchema,
  category: productCategorySchema,
  tags: tagsSchema,
  images: z.array(z.string()).optional().nullable(),
  stock: stockSchema.optional(),
  isPublished: z.boolean().optional(),
  isHeroImage: z.boolean().optional(),
  purchaseUrl: purchaseUrlSchema.optional().nullable(),
  amazonUrl: amazonUrlSchema.optional().nullable(),
  seoKeywords: seoKeywordsSchema.optional().nullable(),
  metaDescription: metaDescriptionSchema.optional().nullable(),
  sleeve: optionalSleeveSchema,
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  id: idSchema,
});

/**
 * 設計ツールからの商品登録（/api/integrations/designer/products）。
 * 公開状態は受け取らない: 新規は必ず非公開で作り、公開は HP の管理画面で人が行う。
 * 画像はこの JSON ではなく multipart のファイルとして受け取る。
 */
export const DesignerProductSchema = z.object({
  designerDesignId: idSchema,
  designerUrl: makeHttpUrlSchema("設計のURLは http(s) 形式で指定してください", { maxLength: 512 }).optional().nullable(),
  name: ProductCreateSchema.shape.name,
  description: ProductCreateSchema.shape.description,
  price: priceSchema,
  category: productCategorySchema,
  tags: tagsSchema,
  stock: stockSchema.optional(),
  purchaseUrl: purchaseUrlSchema.optional().nullable(),
  seoKeywords: seoKeywordsSchema.optional().nullable(),
  metaDescription: metaDescriptionSchema.optional().nullable(),
  // 設計で選んだスリーブ（名前・寸法・枚数）と、登録画面で入れた値引き額
  sleeve: optionalSleeveSchema,
});
export type DesignerProductInput = z.infer<typeof DesignerProductSchema>;

const galleryCategorySchema = z
  .string({ required_error: "カテゴリは必須です" })
  .refine((v) => (VALID_GALLERY_CATEGORIES as readonly string[]).includes(v), {
    message: `カテゴリは${VALID_GALLERY_CATEGORIES.join(", ")}のいずれかを指定してください`,
  });

// 作品に使った商品のID。重複は1件にまとめる。未送信（undefined）は「紐づけを変更しない」を表す。
const workProductIdsSchema = z
  .array(idSchema, { invalid_type_error: "使用商品の指定が正しくありません" })
  .transform((ids) => [...new Set(ids)])
  .pipe(z.array(z.number()).max(WORK_PRODUCTS_MAX, {
    message: `使用商品は${WORK_PRODUCTS_MAX}件以内で指定してください`,
  }))
  .optional();

export const WorkCreateSchema = z.object({
  title: storedText("タイトルは必須です", `タイトルは${VARCHAR_MAX}文字以内で入力してください`),
  description: storedText("説明は必須です"),
  category: galleryCategorySchema,
  tags: tagsSchema,
  image: optionalImageSchema,
  isPublished: z.boolean().optional(),
  productIds: workProductIdsSchema,
});

export const WorkUpdateSchema = WorkCreateSchema.partial().extend({
  id: idSchema,
});

const newsRequiredMessage = "タイトル、内容、日付は必須です";
const newsDateSchema = z
  .custom<string | number>(
    (value) =>
      (typeof value === "string" && value.length > 0) ||
      (typeof value === "number" && value !== 0),
    { message: newsRequiredMessage }
  )
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "日付の形式が正しくありません",
  })
  .transform((value) => new Date(value));

const newsContentsSchema = z.custom<string | { text: string }>(
  (value) =>
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "object" &&
      value !== null &&
      "text" in value &&
      typeof value.text === "string" &&
      value.text.length > 0),
  { message: newsRequiredMessage }
);

export const NewsCreateSchema = z.object({
  title: storedText(newsRequiredMessage, `タイトルは${VARCHAR_MAX}文字以内で入力してください`),
  contents: newsContentsSchema,
  date: newsDateSchema,
  url: makeHttpUrlSchema("URLは http(s) 形式で入力してください").optional().nullable(),
});

export const NewsUpdateSchema = NewsCreateSchema.partial().extend({
  id: idSchema,
});

export const RequiredIdSchema = z.object({ id: idSchema });

// X (旧Twitter) への手動投稿。
// 画像は /uploads/ 配下の既存アップロード画像のみ指定でき、任意URLは受け付けない
// （サーバーが取りに行く先を外部から指定できるとSSRFになるため）。
export const XPostSchema = z.object({
  text: z
    .string({ required_error: "本文は必須です" })
    .min(1, { message: "本文は必須です" })
    .max(X_POST_MAX_LENGTH, {
      message: `本文は${X_POST_MAX_LENGTH}文字以内で入力してください`,
    }),
  imageUrls: z
    .array(
      z
        .string()
        .regex(/^\/uploads\/[A-Za-z0-9._-]+$/, {
          message: "画像はアップロード済みのものだけ指定できます",
        })
    )
    .max(X_POST_MAX_IMAGES, {
      message: `画像は${X_POST_MAX_IMAGES}枚までです`,
    })
    .optional()
    .default([]),
});
