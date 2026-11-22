import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, prismaError, roleCases, sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  product: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  revalidateProductPages: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ product: mocks.product }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/cache-tags", () => ({ revalidateProductPages: mocks.revalidateProductPages }));
// 画像ファイルの後片付けは #406 の対象。ここでは呼び出しだけを止める。
vi.mock("@/lib/uploaded-files", () => ({
  collectImageUrls: vi.fn(() => []),
  deleteUnusedUploadedFiles: vi.fn(),
}));

import { GET as listProducts, POST as createProduct, PUT as updateProduct } from "@/app/api/products/route";

const url = "http://localhost/api/products";
const validCreate = { name: "商品", description: "説明", price: 100, category: "card-display" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.product.findMany.mockResolvedValue([{ id: 1 }]);
  mocks.product.count.mockResolvedValue(1);
  mocks.product.create.mockResolvedValue({ id: 1 });
  mocks.product.update.mockResolvedValue({ id: 1 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("商品一覧（GET）", () => {
  it("公開用は未ログインでも取得でき、公開中の商品だけに絞る", async () => {
    const response = await listProducts(new NextRequest(url));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ products: [{ id: 1 }], total: 1, page: 1 });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    }));
    expect(mocks.product.count).toHaveBeenCalledWith({ where: { isPublished: true } });
  });

  it("includeUnpublished が true 以外の値なら公開中だけ（認証も求めない）", async () => {
    await listProducts(new NextRequest(`${url}?includeUnpublished=1`));
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }));
  });

  it.each(roleCases("EDITOR"))("非公開を含む一覧: $label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await listProducts(new NextRequest(`${url}?includeUnpublished=true`));
    expect(response.status).toBe(status);
    if (allowed) {
      expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    } else {
      expect(mocks.product.findMany).not.toHaveBeenCalled();
    }
  });

  it("page・limit でページ分けする", async () => {
    const response = await listProducts(new NextRequest(`${url}?page=2&limit=3`));
    expect(await response.json()).toMatchObject({ page: 2, limit: 3 });
    expect(mocks.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, skip: 3 }));
  });

  it("DB エラーは500", async () => {
    mocks.product.findMany.mockRejectedValue(new Error("down"));
    expect((await listProducts(new NextRequest(url))).status).toBe(500);
  });
});

describe("商品の作成・更新の権限", () => {
  it.each(roleCases("EDITOR"))("作成: $label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    expect((await createProduct(jsonRequest(url, "POST", validCreate))).status).toBe(status);
    expect(mocks.product.create).toHaveBeenCalledTimes(allowed ? 1 : 0);
    expect(mocks.revalidateProductPages).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it.each(roleCases("EDITOR"))("更新: $label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    expect((await updateProduct(jsonRequest(url, "PUT", { id: 1, name: "更新" }))).status).toBe(status);
    expect(mocks.product.update).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it("権限の確認は入力の検証より先（未ログインなら不正な本文でも401）", async () => {
    expect((await createProduct(jsonRequest(url, "POST", { price: "abc" }))).status).toBe(401);
  });
});

describe("商品の作成", () => {
  it("未指定の項目は既定値（公開・在庫あり・ヒーロー画像でない）で作成する", async () => {
    mocks.auth.mockResolvedValue(sessionFor("EDITOR"));
    await createProduct(jsonRequest(url, "POST", validCreate));
    expect(mocks.product.create.mock.calls[0][0].data).toMatchObject({
      isPublished: true,
      isHeroImage: false,
      stock: "在庫あり",
      purchaseUrl: null,
      amazonUrl: null,
    });
  });

  it("画像を変えない更新では旧値を読まず、存在しなければ Prisma のエラーで404", async () => {
    mocks.auth.mockResolvedValue(sessionFor("EDITOR"));
    mocks.product.update.mockRejectedValue(prismaError("P2025"));
    const response = await updateProduct(jsonRequest(url, "PUT", { id: 999, name: "更新" }));
    expect(response.status).toBe(404);
    expect(mocks.product.findUnique).not.toHaveBeenCalled();
  });

  it("画像を変える更新で商品がなければ、更新せず404", async () => {
    mocks.auth.mockResolvedValue(sessionFor("EDITOR"));
    mocks.product.findUnique.mockResolvedValue(null);
    const response = await updateProduct(jsonRequest(url, "PUT", { id: 999, images: ["/uploads/a.png"] }));
    expect(response.status).toBe(404);
    expect(mocks.product.update).not.toHaveBeenCalled();
  });
});
