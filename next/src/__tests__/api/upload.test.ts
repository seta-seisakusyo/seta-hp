import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { roleCases, sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  saveUploadedImage: vi.fn(),
  maybeSweepUnusedUploads: vi.fn(),
  after: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({}) }));
// 保存・回収の中身は別のテスト（と #406）の対象。ここではルートの振る舞いだけを見る。
vi.mock("@/lib/upload-storage", () => ({ saveUploadedImage: mocks.saveUploadedImage }));
vi.mock("@/lib/upload-sweeper", () => ({ maybeSweepUnusedUploads: mocks.maybeSweepUnusedUploads }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));

import { POST as upload } from "@/app/api/upload/route";

function uploadRequest(file?: File | string) {
  const form = new FormData();
  if (file !== undefined) form.append("file", file);
  return new NextRequest("http://localhost/api/upload", { method: "POST", body: form });
}
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(sessionFor("EDITOR"));
  mocks.saveUploadedImage.mockResolvedValue({ url: "/uploads/saved.png" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("画像アップロードの権限", () => {
  it.each(roleCases("EDITOR"))("$label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await upload(uploadRequest(png()));
    expect(response.status).toBe(status);
    expect(mocks.saveUploadedImage).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });
});

describe("画像アップロード", () => {
  it("保存した URL を返し、応答後に未使用画像の回収を予約する", async () => {
    const file = png();
    const response = await upload(uploadRequest(file));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "/uploads/saved.png" });
    expect(mocks.saveUploadedImage.mock.calls[0][0]).toBeInstanceOf(File);
    expect(mocks.saveUploadedImage.mock.calls[0][0].name).toBe("a.png");

    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.maybeSweepUnusedUploads).not.toHaveBeenCalled();
    mocks.after.mock.calls[0][0]();
    expect(mocks.maybeSweepUnusedUploads).toHaveBeenCalledTimes(1);
  });

  it("ファイルがなければ400", async () => {
    const response = await upload(uploadRequest());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ファイルが選択されていません" });
    expect(mocks.saveUploadedImage).not.toHaveBeenCalled();
  });

  it("保存側が不正なファイルと判定したら、その理由で400にし、回収は予約しない", async () => {
    mocks.saveUploadedImage.mockResolvedValue({ error: "対応していない画像形式です" });
    const response = await upload(uploadRequest(png()));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "対応していない画像形式です" });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("保存中の例外は500", async () => {
    mocks.saveUploadedImage.mockRejectedValue(new Error("disk full"));
    const response = await upload(uploadRequest(png()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "アップロードに失敗しました" });
  });

  it("multipart でない本文は500（クラッシュしない）", async () => {
    const response = await upload(new NextRequest("http://localhost/api/upload", { method: "POST", body: "plain" }));
    expect(response.status).toBe(500);
    expect(mocks.saveUploadedImage).not.toHaveBeenCalled();
  });
});
