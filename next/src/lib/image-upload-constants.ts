export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;
/** 商品1件あたりの画像の上限（管理画面の MultiImageUpload の既定値と API の検証で共有する）。 */
export const PRODUCT_MAX_IMAGES = 10;
export const IMAGE_ACCEPT =ALLOWED_IMAGE_TYPES.join(",");
export const IMAGE_UPLOAD_HINT =
  "JPG, PNG, GIF, WebP (最大" + MAX_IMAGE_SIZE_MB + "MB)";
