import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  product: { create: vi.fn(), update: vi.fn() },
  work: { create: vi.fn(), update: vi.fn() },
  news: { create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => mocks }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { role: "ADMIN" } }) }));
vi.mock("@/lib/cache-tags", () => ({ revalidateProductPages: vi.fn(), revalidateWorkPages: vi.fn() }));
import { POST as createProduct, PUT as updateProduct } from "@/app/api/products/route";
import { POST as createWork, PUT as updateWork } from "@/app/api/works/route";
import { POST as createNews, PUT as updateNews } from "@/app/api/news/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/resource", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => vi.clearAllMocks());
const resources = [
  { create: createProduct, update: updateProduct, model: mocks.product, field: "name", base: { description: "説明", price: 100, category: "card-display" } },
  { create: createWork, update: updateWork, model: mocks.work, field: "title", base: { description: "説明", category: "laser" } },
  { create: createNews, update: updateNews, model: mocks.news, field: "title", base: { contents: "本文", date: "2026-09-23" } },
];
for (const resource of resources) {
  describe(resource.field + JSON.stringify(resource.base), () => {
    it("変換後のVARCHAR超過を作成・更新ともDB到達前に400にする", async () => {
      const body = { ...resource.base, [resource.field]: "<".repeat(50) };
      expect((await resource.create(request(body))).status).toBe(400);
      expect((await resource.update(request({ ...body, id: 1 }))).status).toBe(400);
      expect(resource.model.create).not.toHaveBeenCalled();
      expect(resource.model.update).not.toHaveBeenCalled();
    });
    it("変換後191文字の境界値をそのまま保存する", async () => {
      const value = ">".repeat(47) + "abc";
      expect((await resource.create(request({ ...resource.base, [resource.field]: value }))).status).toBe(200);
      expect(resource.model.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ [resource.field]: "&gt;".repeat(47) + "abc" }) }));
    });
  });
}
it.each([{ price: 2147483648 }, { tags: "a".repeat(192) }, { tags: ["<".repeat(48)] }, { id: 2147483648 }])("DB境界を超える更新を拒否する: %j", async (fields) => {
  expect((await updateProduct(request({ id: 1, ...fields }))).status).toBe(400);
  expect(mocks.product.update).not.toHaveBeenCalled();
});
it("部分更新では未送信項目を変更せず、URL・タグの明示クリアを保持する", async () => {
  expect((await updateProduct(request({ id: 1, purchaseUrl: "", tags: [] }))).status).toBe(200);
  expect(mocks.product.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: undefined, purchaseUrl: null, tags: "" }) }));
});
