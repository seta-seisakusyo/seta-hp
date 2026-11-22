import type { PrismaClient } from "@prisma/client";
import { uploadFileNameFromUrl } from "@/lib/upload-paths";
import { getUploadDir, unlinkUpload } from "@/lib/upload-storage";
import { collectSleeveImageUrls } from "@/lib/types/product";

type ImageRecord = {
  image?: string | null;
  images?: unknown;
  /** Product.sleeve（対応スリーブの画像も参照として数える） */
  sleeve?: unknown;
};

export function collectImageUrls(record: ImageRecord): string[] {
  const urls = new Set<string>();
  if (record.image) urls.add(record.image);
  if (Array.isArray(record.images)) {
    for (const image of record.images) {
      if (typeof image === "string") urls.add(image);
    }
  }
  for (const image of collectSleeveImageUrls(record.sleeve)) urls.add(image);
  return [...urls];
}

function collectUploadFileNames(urls: string[]): Set<string> {
  const names = new Set<string>();
  for (const url of urls) {
    const name = uploadFileNameFromUrl(url);
    if (name) names.add(name);
  }
  return names;
}

/** 商品（画像・対応スリーブの画像）と作品から参照されているアップロードのファイル名。 */
export async function getReferencedUploadFileNames(prisma: PrismaClient): Promise<Set<string>> {
  const [products, works] = await Promise.all([
    prisma.product.findMany({ select: { images: true, sleeve: true } }),
    prisma.work.findMany({ select: { image: true } }),
  ]);
  return collectUploadFileNames([...products, ...works].flatMap(collectImageUrls));
}

/**
 * 保存・削除後の後片付け。参照確認に失敗した場合はファイルを残す。
 * uploadDir はテストで一時ディレクトリを渡すためのもの（既定は getUploadDir()）。
 */
export async function deleteUnusedUploadedFiles(
  prisma: PrismaClient,
  urls: string[],
  { uploadDir = getUploadDir() }: { uploadDir?: string } = {},
): Promise<void> {
  const candidates = collectUploadFileNames(urls);
  if (candidates.size === 0) return;

  let referenced: Set<string>;
  try {
    referenced = await getReferencedUploadFileNames(prisma);
  } catch (error) {
    console.error("Failed to check uploaded file references:", error);
    return;
  }

  // 検証済みのファイル名をそのまま使い、URLの二重デコードを避ける。
  await Promise.all(
    [...candidates]
      .filter((name) => !referenced.has(name))
      .map((name) => unlinkUpload(name, { uploadDir, logLabel: "Failed to delete uploaded file:" })),
  );
}
