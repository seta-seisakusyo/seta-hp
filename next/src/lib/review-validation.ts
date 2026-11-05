import xss from "xss";
import { z } from "zod";
import {
  REVIEW_MAX_CONTENT,
  REVIEW_MAX_NAME,
  REVIEW_MAX_PAGE_URL,
  REVIEW_STATUSES,
} from "@/lib/review-constants";

/** レビュー入力をサニタイズし、DB/UI共通の上限長へ丸める。 */
export function cleanReviewInput(value: unknown, max: number): string {
  return xss(String(value ?? "")).trim().slice(0, max);
}

const requiredCleanText = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? cleanReviewInput(value, max) : ""),
    z.string().min(1, { message })
  );

const coordinate = z
  .number({ error: "座標が不正です" })
  .finite({ message: "座標が不正です" });

const requiredFieldsMessage = "pageUrl / authorName / content は必須です";

export const ReviewCommentCreateSchema = z.object({
  pageUrl: requiredCleanText(REVIEW_MAX_PAGE_URL, requiredFieldsMessage),
  authorName: requiredCleanText(REVIEW_MAX_NAME, requiredFieldsMessage),
  content: requiredCleanText(REVIEW_MAX_CONTENT, requiredFieldsMessage),
  xRatio: coordinate
    .min(0, { message: "座標が不正です" })
    .max(1, { message: "座標が不正です" }),
  yAbsolute: coordinate.min(0, { message: "座標が不正です" }),
});

const requiredReplyFieldsMessage = "authorName / content は必須です";

export const ReviewReplyCreateSchema = z.object({
  authorName: requiredCleanText(REVIEW_MAX_NAME, requiredReplyFieldsMessage),
  content: requiredCleanText(REVIEW_MAX_CONTENT, requiredReplyFieldsMessage),
});

export const ReviewStatusUpdateSchema = z.object({
  status: z.enum(REVIEW_STATUSES, {
    error: "status は open または resolved を指定してください",
  }),
});
