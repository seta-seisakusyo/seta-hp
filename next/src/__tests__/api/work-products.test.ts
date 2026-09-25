import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  work: { create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  auth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ work: mocks.work }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/cache-tags", () => ({ revalidateProductPages: vi.fn(), revalidateWorkPages: vi.fn() }));

import { GET, POST, PUT } from "@/app/api/works/route";
import { WORK_PRODUCTS_MAX } from "@/lib/work-constants";

const request = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/works", { method, body: JSON.stringify(body) });
const base = { title: "壁面展示", description: "説明", category: "laser" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { role: "EDITOR" } });
  mocks.work.create.mockResolvedValue({ id: 1 });
  mocks.work.update.mockResolvedValue({ id: 1 });
  mocks.work.count.mockResolvedValue(1);
});

const dataOf = (fn: typeof mocks.work.create) => fn.mock.calls[0][0].data;

describe("作品の使用商品（POST）", () => {
  it("指定した商品を重複を除いて紐づける", async () => {
    const response = await POST(request("POST", { ...base, productIds: [3, 1, 3] }));
    expect(response.status).toBe(200);
    expect(dataOf(mocks.work.create).products).toEqual({
      create: [{ productId: 3 }, { productId: 1 }],
    });
  });

  it("未指定なら紐づけを作らず、空配列なら0件で作る", async () => {
    await POST(request("POST", base));
    await POST(request("POST", { ...base, productIds: [] }));
    expect(mocks.work.create.mock.calls[0][0].data.products).toBeUndefined();
    expect(mocks.work.create.mock.calls[1][0].data.products).toEqual({ create: [] });
  });

  it.each([
    [{ productIds: [0] }],
    [{ productIds: ["1"] }],
    [{ productIds: [1.5] }],
    [{ productIds: 1 }],
    [{ productIds: Array.from({ length: WORK_PRODUCTS_MAX + 1 }, (_, i) => i + 1) }],
  ])("不正な指定はDB到達前に400にする: %j", async (fields) => {
    const response = await POST(request("POST", { ...base, ...fields }));
    expect(response.status).toBe(400);
    expect(mocks.work.create).not.toHaveBeenCalled();
  });

  it("重複を除いて上限以内なら受け付ける", async () => {
    const ids = Array.from({ length: WORK_PRODUCTS_MAX }, (_, i) => i + 1);
    const response = await POST(request("POST", { ...base, productIds: [...ids, 1] }));
    expect(response.status).toBe(200);
  });

  it("存在しない商品ID（外部キー違反）は400を返す", async () => {
    mocks.work.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003", clientVersion: "test",
    }));
    const response = await POST(request("POST", { ...base, productIds: [999] }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("存在しない商品");
  });

  it("VIEWER は紐づけできない", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "VIEWER" } });
    const response = await POST(request("POST", { ...base, productIds: [1] }));
    expect(response.status).toBe(403);
    expect(mocks.work.create).not.toHaveBeenCalled();
  });
});

describe("作品の使用商品（PUT）", () => {
  it("指定時は既存の紐づけを入れ替える", async () => {
    const response = await PUT(request("PUT", { id: 1, productIds: [2, 5] }));
    expect(response.status).toBe(200);
    expect(dataOf(mocks.work.update).products).toEqual({
      deleteMany: {},
      create: [{ productId: 2 }, { productId: 5 }],
    });
  });

  it("空配列なら紐づけをすべて外す", async () => {
    await PUT(request("PUT", { id: 1, productIds: [] }));
    expect(dataOf(mocks.work.update).products).toEqual({ deleteMany: {}, create: [] });
  });

  it("未指定なら紐づけを変更しない", async () => {
    await PUT(request("PUT", { id: 1, isPublished: false }));
    expect(dataOf(mocks.work.update).products).toBeUndefined();
  });

  it("存在しない商品ID（外部キー違反）は400を返す", async () => {
    mocks.work.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003", clientVersion: "test",
    }));
    const response = await PUT(request("PUT", { id: 1, productIds: [999] }));
    expect(response.status).toBe(400);
  });
});

describe("作品一覧（GET）の使用商品", () => {
  it("管理用（includeUnpublished）では productIds を返す", async () => {
    mocks.work.findMany.mockResolvedValue([
      { id: 1, title: "A", products: [{ productId: 2 }, { productId: 7 }] },
    ]);
    const response = await GET(new NextRequest("http://localhost/api/works?includeUnpublished=true"));
    const body = await response.json();
    expect(body.works[0]).toEqual({ id: 1, title: "A", productIds: [2, 7] });
  });

  it("公開用では紐づけを取得・返却しない", async () => {
    mocks.work.findMany.mockResolvedValue([{ id: 1, title: "A" }]);
    const response = await GET(new NextRequest("http://localhost/api/works"));
    const body = await response.json();
    expect(mocks.work.findMany.mock.calls[0][0].select.products).toBe(false);
    expect(body.works[0]).not.toHaveProperty("productIds");
  });
});
