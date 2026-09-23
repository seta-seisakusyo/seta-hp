import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  product: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  work: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  cleanup: vi.fn(),
  revalidateProducts: vi.fn(),
  revalidateWorks: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ product: mocks.product, work: mocks.work }) }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { role: "ADMIN" } }) }));
vi.mock("@/lib/cache-tags", () => ({
  revalidateProductPages: mocks.revalidateProducts,
  revalidateWorkPages: mocks.revalidateWorks,
}));
vi.mock("@/lib/uploaded-files", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/uploaded-files")>(),
  deleteUnusedUploadedFiles: mocks.cleanup,
}));

import { PUT as updateProduct, DELETE as deleteProduct } from "@/app/api/products/route";
import { PUT as updateWork, DELETE as deleteWork } from "@/app/api/works/route";

const resources = [
  { name: "商品", update: updateProduct, remove: deleteProduct, model: mocks.product,
    field: "images", old: ["/uploads/old.png"], clear: null, revalidate: mocks.revalidateProducts },
  { name: "制作事例", update: updateWork, remove: deleteWork, model: mocks.work,
    field: "image", old: "/uploads/old.png", clear: "", revalidate: mocks.revalidateWorks },
];
const request = (method: string, body: unknown) => new NextRequest("http://localhost/api/resource", {
  method, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const resource of resources) {
    resource.model.findUnique.mockResolvedValue({ [resource.field]: resource.old });
    resource.model.update.mockResolvedValue({ id: 1 });
    resource.model.delete.mockResolvedValue({ [resource.field]: resource.old });
  }
  mocks.cleanup.mockResolvedValue(undefined);
});

for (const resource of resources) {
  describe(`${resource.name}の画像後処理`, () => {
    it("画像未変更なら旧画像の取得・参照照会を行わず、公開状態を更新する", async () => {
      const response = await resource.update(request("PUT", { id: 1, isPublished: false }));
      expect(response.status).toBe(200);
      expect(resource.model.findUnique).not.toHaveBeenCalled();
      expect(mocks.cleanup).not.toHaveBeenCalled();
      expect(resource.model.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isPublished: false }),
      }));
      expect(resource.revalidate).toHaveBeenCalledOnce();
    });

    it("画像クリアの保存後に旧画像を後処理へ渡す", async () => {
      const response = await resource.update(request("PUT", { id: 1, [resource.field]: resource.clear }));
      expect(response.status).toBe(200);
      expect(mocks.cleanup).toHaveBeenCalledWith(expect.anything(), ["/uploads/old.png"]);
      expect(resource.model.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.cleanup.mock.invocationCallOrder[0]);
      expect(resource.revalidate).toHaveBeenCalledOnce();
    });

    it("画像未変更の存在しないIDも404を返す", async () => {
      resource.model.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("missing", {
        code: "P2025", clientVersion: "test",
      }));
      const response = await resource.update(request("PUT", { id: 999, isPublished: false }));
      expect(response.status).toBe(404);
      expect(resource.revalidate).not.toHaveBeenCalled();
      expect(mocks.cleanup).not.toHaveBeenCalled();
    });

    it("削除結果の画像を使い、存在確認の別クエリを実行しない", async () => {
      const response = await resource.remove(request("DELETE", { id: 1 }));
      expect(response.status).toBe(200);
      expect(resource.model.delete).toHaveBeenCalledWith({ where: { id: 1 }, select: { [resource.field]: true } });
      expect(resource.model.findUnique).not.toHaveBeenCalled();
      expect(mocks.cleanup).toHaveBeenCalledWith(expect.anything(), ["/uploads/old.png"]);
      expect(resource.revalidate).toHaveBeenCalledOnce();
    });
  });
}
