import { mkdtemp, readdir, rm, utimes, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  maybeSweepUnusedUploads,
  SWEEP_INTERVAL_MS,
  SWEEP_MIN_AGE_MS,
  SWEEP_STATE_FILE,
  sweepUnusedUploads,
} from "@/lib/upload-sweeper";

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const OLD = NOW - SWEEP_MIN_AGE_MS - 60_000;
const RECENT = NOW - 60_000;

let dir: string;

function prismaWith(
  products: Array<{ images?: unknown; sleeve?: unknown }>,
  works: Array<{ image: string | null }> = []
) {
  return {
    product: { findMany: vi.fn().mockResolvedValue(products) },
    work: { findMany: vi.fn().mockResolvedValue(works) },
  } as unknown as PrismaClient;
}

async function addFile(name: string, mtimeMs: number) {
  const filePath = path.join(dir, name);
  await writeFile(filePath, "x");
  await utimes(filePath, mtimeMs / 1000, mtimeMs / 1000);
}

const remaining = async () => (await readdir(dir)).filter((name) => !name.startsWith(".")).sort();

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "upload-sweep-"));
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("sweepUnusedUploads", () => {
  it("参照されず24時間以上たった画像だけを消す", async () => {
    await addFile("used-product.png", OLD);
    await addFile("used-sleeve.png", OLD);
    await addFile("used-work.png", OLD);
    await addFile("orphan-old.png", OLD);
    await addFile("orphan-recent.png", RECENT);
    const prisma = prismaWith(
      [{ images: ["/uploads/used-product.png"], sleeve: { name: "S", images: ["/uploads/used-sleeve.png"] } }],
      [{ image: "/uploads/used-work.png" }]
    );

    const result = await sweepUnusedUploads(prisma, { uploadDir: dir, now: NOW });

    expect(result.deleted).toEqual(["orphan-old.png"]);
    expect(await remaining()).toEqual(["orphan-recent.png", "used-product.png", "used-sleeve.png", "used-work.png"]);
  });

  it("参照の確認に失敗したら1件も消さない", async () => {
    await addFile("orphan-old.png", OLD);
    const prisma = {
      product: { findMany: vi.fn().mockRejectedValue(new Error("db down")) },
      work: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const result = await sweepUnusedUploads(prisma, { uploadDir: dir, now: NOW });

    expect(result).toEqual({ deleted: [], skippedReason: "reference-check-failed" });
    expect(await remaining()).toEqual(["orphan-old.png"]);
  });

  it("ドットファイル（実行記録など）は消さない", async () => {
    await addFile(SWEEP_STATE_FILE, OLD);
    await sweepUnusedUploads(prismaWith([]), { uploadDir: dir, now: NOW });
    expect(await readdir(dir)).toContain(SWEEP_STATE_FILE);
  });
});

describe("maybeSweepUnusedUploads", () => {
  it("1日1回だけ動き、実行記録はファイルに残る（再起動しても引き継がれる）", async () => {
    const prisma = prismaWith([]);
    await addFile("orphan-1.png", OLD);
    expect((await maybeSweepUnusedUploads(prisma, { uploadDir: dir, now: NOW }))?.deleted).toEqual(["orphan-1.png"]);

    // 24時間以内の再実行は何もしない（記録はファイルから読むので、プロセスが変わっても同じ）
    await addFile("orphan-2.png", OLD);
    expect(await maybeSweepUnusedUploads(prisma, { uploadDir: dir, now: NOW + SWEEP_INTERVAL_MS - 1 })).toBeNull();
    expect(await remaining()).toEqual(["orphan-2.png"]);

    // 24時間たてば再び回収する
    const next = await maybeSweepUnusedUploads(prisma, { uploadDir: dir, now: NOW + SWEEP_INTERVAL_MS });
    expect(next?.deleted).toEqual(["orphan-2.png"]);
  });

  it("同時に呼ばれても回収は1回だけ", async () => {
    const prisma = prismaWith([]);
    await addFile("orphan.png", OLD);
    const [first, second] = await Promise.all([
      maybeSweepUnusedUploads(prisma, { uploadDir: dir, now: NOW }),
      maybeSweepUnusedUploads(prisma, { uploadDir: dir, now: NOW }),
    ]);
    expect(first).toBe(second);
    expect((prisma.product.findMany as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("失敗しても例外を投げない（アップロードの成功を妨げない）", async () => {
    const prisma = prismaWith([]);
    await expect(
      maybeSweepUnusedUploads(prisma, { uploadDir: path.join(dir, "missing", "nested"), now: NOW })
    ).resolves.toBeNull();
  });
});
