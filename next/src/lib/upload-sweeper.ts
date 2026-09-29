import type { PrismaClient } from "@prisma/client";
import { readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { getReferencedUploadFileNames } from "@/lib/uploaded-files";

/**
 * 使われていないアップロード画像の回収（#338）。
 *
 * 保存・削除時の差し替え分は uploaded-files.ts が消すが、アップロード後に保存をやめた画像や
 * X 投稿だけに使った画像は、どこからも参照されないまま残り続ける。
 * アップロードのついでに1日1回だけ、商品（画像・対応スリーブ）と作品のどこからも参照されず、
 * 作られてから24時間以上たった画像を消す。
 *
 * - 参照の確認に失敗したら何も消さない（消しすぎより残しすぎを選ぶ）
 * - 実行の記録は uploads 配下のファイルに残し、再起動しても1日1回を守る
 * - 同じプロセス内での同時実行はしない（本番は next_app 1プロセス）
 */

export const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const SWEEP_MIN_AGE_MS = 24 * 60 * 60 * 1000;
/** 実行記録。先頭が "." のファイルは回収対象にしない（アップロード名は UUID なので衝突しない）。 */
export const SWEEP_STATE_FILE = ".upload-sweep.json";

export interface SweepResult {
  deleted: string[];
  skippedReason?: "reference-check-failed";
}

function defaultUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/** 参照されず、作られてから SWEEP_MIN_AGE_MS 以上たった画像を消す。 */
export async function sweepUnusedUploads(
  prisma: PrismaClient,
  { uploadDir = defaultUploadDir(), now = Date.now() }: { uploadDir?: string; now?: number } = {}
): Promise<SweepResult> {
  let referenced: Set<string>;
  try {
    referenced = await getReferencedUploadFileNames(prisma);
  } catch (error) {
    console.error("[upload-sweep] 参照の確認に失敗したため、画像は消しません:", error);
    return { deleted: [], skippedReason: "reference-check-failed" };
  }

  let names: string[];
  try {
    names = await readdir(uploadDir);
  } catch {
    return { deleted: [] };
  }

  const deleted: string[] = [];
  for (const name of names) {
    if (name.startsWith(".") || referenced.has(name)) continue;
    const filePath = path.join(uploadDir, name);
    try {
      const info = await stat(filePath);
      if (!info.isFile() || now - info.mtimeMs < SWEEP_MIN_AGE_MS) continue;
      await unlink(filePath);
      deleted.push(name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[upload-sweep] 画像を消せませんでした:", filePath, error);
      }
    }
  }
  if (deleted.length > 0) {
    console.info(`[upload-sweep] 使われていない画像を ${deleted.length} 件削除しました:`, deleted.join(", "));
  }
  return { deleted };
}

async function readLastRunAt(stateFile: string): Promise<number | null> {
  try {
    const data: unknown = JSON.parse(await readFile(stateFile, "utf8"));
    const value = typeof data === "object" && data !== null && "lastRunAt" in data ? data.lastRunAt : null;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

let running: Promise<SweepResult | null> | null = null;

/**
 * 前回から SWEEP_INTERVAL_MS 以上たっていれば回収する。実行中なら同じ実行を待つだけ。
 * 例外は投げない（アップロードの成功を妨げないため）。実行しなかった場合は null。
 */
export function maybeSweepUnusedUploads(
  prisma: PrismaClient,
  options: { uploadDir?: string; now?: number } = {}
): Promise<SweepResult | null> {
  if (running) return running;
  running = (async () => {
    const uploadDir = options.uploadDir ?? defaultUploadDir();
    const now = options.now ?? Date.now();
    const stateFile = path.join(uploadDir, SWEEP_STATE_FILE);
    try {
      const lastRunAt = await readLastRunAt(stateFile);
      if (lastRunAt !== null && now - lastRunAt < SWEEP_INTERVAL_MS) return null;
      // 先に記録してから回収する。途中で落ちても、次は24時間後まで走らない（連続実行を防ぐ）。
      await writeFile(stateFile, JSON.stringify({ lastRunAt: now }));
      return await sweepUnusedUploads(prisma, { uploadDir, now });
    } catch (error) {
      console.error("[upload-sweep] 回収に失敗しました:", error);
      return null;
    }
  })().finally(() => {
    running = null;
  });
  return running;
}
