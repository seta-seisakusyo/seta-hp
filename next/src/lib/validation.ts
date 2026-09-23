import * as z from "zod";
import {
  VALID_GALLERY_CATEGORIES,
  VALID_PRODUCT_CATEGORIES,
  VALID_STOCK_OPTIONS,
} from "@/lib/constants/categories";
import { X_POST_MAX_IMAGES, X_POST_MAX_LENGTH } from "@/lib/x-constants";

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
// スキーマは検証のみを担い、XSS サニタイズや DB への整形は各ルート側で行う。
// ---------------------------------------------------------------------------

const priceSchema = z.coerce
  .number({ invalid_type_error: "価格は0以上の整数を指定してください" })
  .int({ message: "価格は0以上の整数を指定してください" })
  .min(0, { message: "価格は0以上の整数を指定してください" });

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

/**
 * http(s) スキームのみを許可するURLスキーマを生成する。
 * `javascript:` や `data:` などのスキームは new URL() では解析が通ってしまうため、
 * protocol を明示的に検査して格納・描画時の XSS（例: <a href="javascript:...">）を防ぐ。
 */
function makeHttpUrlSchema(message: string) {
  return z
    .string()
    .max(VARCHAR_MAX, { message })
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const { protocol } = new URL(v);
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      },
      { message }
    );
}

const purchaseUrlSchema = makeHttpUrlSchema("購入URLは http(s) 形式の有効なURLを指定してください");

const idSchema = z
  .number({ required_error: "IDは必須です", invalid_type_error: "IDは必須です" })
  .int({ message: "IDは必須です" })
  .positive({ message: "IDは必須です" });

const tagsSchema = z.union([z.string(), z.array(z.unknown())]).optional();
const optionalImageSchema = z.string().optional().nullable();

export const ProductCreateSchema = z.object({
  name: z
    .string({ required_error: "名前は必須です" })
    .min(1, { message: "名前は必須です" })
    .max(VARCHAR_MAX, { message: `名前は${VARCHAR_MAX}文字以内で入力してください` }),
  description: z.string({ required_error: "説明は必須です" }).min(1, { message: "説明は必須です" }),
  price: priceSchema,
  category: productCategorySchema,
  tags: tagsSchema,
  images: z.array(z.string()).optional().nullable(),
  stock: stockSchema.optional(),
  isPublished: z.boolean().optional(),
  isHeroImage: z.boolean().optional(),
  purchaseUrl: purchaseUrlSchema.optional().nullable(),
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  id: idSchema,
});

const galleryCategorySchema = z
  .string({ required_error: "カテゴリは必須です" })
  .refine((v) => (VALID_GALLERY_CATEGORIES as readonly string[]).includes(v), {
    message: `カテゴリは${VALID_GALLERY_CATEGORIES.join(", ")}のいずれかを指定してください`,
  });

export const WorkCreateSchema = z.object({
  title: z
    .string({ required_error: "タイトルは必須です" })
    .min(1, { message: "タイトルは必須です" })
    .max(VARCHAR_MAX, { message: `タイトルは${VARCHAR_MAX}文字以内で入力してください` }),
  description: z.string({ required_error: "説明は必須です" }).min(1, { message: "説明は必須です" }),
  category: galleryCategorySchema,
  tags: tagsSchema,
  image: optionalImageSchema,
  isPublished: z.boolean().optional(),
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
  title: z
    .string({ required_error: newsRequiredMessage })
    .min(1, { message: newsRequiredMessage })
    .max(VARCHAR_MAX, { message: `タイトルは${VARCHAR_MAX}文字以内で入力してください` }),
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
