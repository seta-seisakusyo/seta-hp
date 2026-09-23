import type { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import path from "path";
import { normalizeImageUrl } from "@/lib/images";

type ImageRecord = {
  image?: string | null;
  images?: unknown;
};

const UPLOAD_PATH_PREFIX = "/uploads/";

function getUploadFileName(value: string | null | undefined): string | null {
  const normalized = normalizeImageUrl(value);
  // 外部URLの /uploads/ はローカルファイルとして扱わない。
  if (!normalized?.startsWith(UPLOAD_PATH_PREFIX)) return null;

  try {
    const { pathname } = new URL(normalized, "http://localhost");
    if (!pathname.startsWith(UPLOAD_PATH_PREFIX)) return null;

    const fileName = decodeURIComponent(pathname.slice(UPLOAD_PATH_PREFIX.length));
    if (!fileName || /[/\\\0]/.test(fileName) || fileName === "." || fileName === "..") {
      return null;
    }
    return fileName;
  } catch {
    // 壊れたパーセントエンコードなど、過去データの不正URLは掃除対象から外す。
    return null;
  }
}

export function collectImageUrls(record: ImageRecord): string[] {
  const urls = new Set<string>();
  if (record.image) urls.add(record.image);
  if (Array.isArray(record.images)) {
    for (const image of record.images) {
      if (typeof image === "string") urls.add(image);
    }
  }
  return [...urls];
}

function collectUploadFileNames(urls: string[]): Set<string> {
  const names = new Set<string>();
  for (const url of urls) {
    const name = getUploadFileName(url);
    if (name) names.add(name);
  }
  return names;
}

async function getReferencedUploadFileNames(prisma: PrismaClient): Promise<Set<string>> {
  const [products, works] = await Promise.all([
    prisma.product.findMany({ select: { images: true } }),
    prisma.work.findMany({ select: { image: true } }),
  ]);
  return collectUploadFileNames([...products, ...works].flatMap(collectImageUrls));
}

/** 保存・削除後の後片付け。参照確認に失敗した場合はファイルを残す。 */
export async function deleteUnusedUploadedFiles(prisma: PrismaClient, urls: string[]): Promise<void> {
  const candidates = collectUploadFileNames(urls);
  if (candidates.size === 0) return;

  let referenced: Set<string>;
  try {
    referenced = await getReferencedUploadFileNames(prisma);
  } catch (error) {
    console.error("Failed to check uploaded file references:", error);
    return;
  }

  const uploadDir = path.resolve(process.cwd(), "public", "uploads");
  await Promise.all(
    [...candidates]
      .filter((name) => !referenced.has(name))
      .map(async (name) => {
        // 検証済みのファイル名をそのまま使い、URLの二重デコードを避ける。
        const filePath = path.join(uploadDir, name);
        try {
          await unlink(filePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Failed to delete uploaded file:", filePath, error);
          }
        }
      }),
  );
}
