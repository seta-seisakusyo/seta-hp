import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  product: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  cleanup: vi.fn(),
  revalidate: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ product: mocks.product }) }));
// handleApiError が api-utils 経由で next-auth を読むため。連携APIはセッションを使わない。
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/cache-tags", () => ({ revalidateProductPages: mocks.revalidate }));
vi.mock("@/lib/uploaded-files", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/uploaded-files")>(),
  deleteUnusedUploadedFiles: mocks.cleanup,
}));
vi.mock("@/lib/upload-storage", () => ({ saveUploadedImage: mocks.save, removeSavedUploads: mocks.remove }));

import { GET, POST } from "@/app/api/integrations/designer/products/route";

const SECRET = "test-secret";
const payload = {
  designerDesignId: 12,
  designerUrl: "https://designer.kaza-love.com/?designId=12",
  name: "16枚用カードディスプレイ",
  description: "MLBカードを16枚飾れるアクリルディスプレイです。",
  price: 12800,
  category: "card-display",
  tags: ["16枚", "マグネット"],
  seoKeywords: "カードディスプレイ, トレカ 飾る",
  metaDescription: "MLBカード16枚用のアクリルディスプレイ。",
};

function post(body: unknown, { secret = SECRET, images = 1 }: { secret?: string | null; images?: number } = {}) {
  const form = new FormData();
  form.set("payload", typeof body === "string" ? body : JSON.stringify(body));
  for (let index = 0; index < images; index += 1) {
    form.append("images", new File([new Uint8Array([1])], `image-${index}.webp`, { type: "image/webp" }));
  }
  const headers: Record<string, string> = {};
  if (secret !== null) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://next_app:3000/api/integrations/designer/products", {
    method: "POST", body: form, headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DESIGNER_API_SECRET", SECRET);
  let sequence = 0;
  mocks.save.mockImplementation(async () => ({ url: `/uploads/new-${(sequence += 1)}.webp` }));
  mocks.product.findUnique.mockResolvedValue(null);
  mocks.product.create.mockResolvedValue({ id: 40, isPublished: false });
  mocks.product.update.mockResolvedValue({ id: 40, isPublished: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("設計ツール連携: 認証", () => {
  it("合言葉が無い・違うリクエストは 401 で断り、何も保存しない", async () => {
    for (const secret of [null, "wrong", `${SECRET}x`]) {
      const response = await POST(post(payload, { secret }));
      expect(response.status).toBe(401);
    }
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.product.create).not.toHaveBeenCalled();
  });

  it("サーバーに合言葉が設定されていなければ連携自体を無効にする", async () => {
    vi.stubEnv("DESIGNER_API_SECRET", "");
    const response = await POST(post(payload));
    expect(response.status).toBe(503);
  });
});

describe("設計ツール連携: 登録", () => {
  it("新規は非公開で作り、画像・SEO項目・設計への紐づけを保存する", async () => {
    const response = await POST(post(payload, { images: 2 }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: 40, isPublished: false, url: "/products/40", created: true,
    });
    expect(mocks.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        designerDesignId: 12,
        designerUrl: payload.designerUrl,
        isPublished: false,
        images: ["/uploads/new-1.webp", "/uploads/new-2.webp"],
        tags: "16枚,マグネット",
        seoKeywords: "カードディスプレイ,トレカ 飾る",
        stock: "受注生産",
      }),
    }));
    expect(mocks.revalidate).toHaveBeenCalledOnce();
  });

  it("同じ設計の再登録は既存商品を更新し、公開状態は変えず、旧画像を後処理へ渡す", async () => {
    mocks.product.findUnique.mockResolvedValue({ id: 40, images: ["/uploads/old.webp"] });
    const response = await POST(post({ ...payload, price: 13800 }));
    expect(response.status).toBe(200);
    const update = mocks.product.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 40 });
    expect(update.data.price).toBe(13800);
    expect(update.data.images).toEqual(["/uploads/new-1.webp"]);
    expect(update.data).not.toHaveProperty("isPublished");
    expect(mocks.cleanup).toHaveBeenCalledWith(expect.anything(), ["/uploads/old.webp"]);
    expect(mocks.product.create).not.toHaveBeenCalled();
  });

  it("画像を送らない更新では画像を変えない", async () => {
    mocks.product.findUnique.mockResolvedValue({ id: 40, images: ["/uploads/old.webp"] });
    await POST(post(payload, { images: 0 }));
    expect(mocks.product.update.mock.calls[0][0].data).not.toHaveProperty("images");
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });

  it("不正な入力は 400 で、保存済みの画像は残さない", async () => {
    const missing = await POST(post({ ...payload, name: "" }));
    expect(missing.status).toBe(400);
    const badJson = await POST(post("{not json"));
    expect(badJson.status).toBe(400);

    mocks.save
      .mockResolvedValueOnce({ url: "/uploads/first.webp" })
      .mockResolvedValueOnce({ error: "ファイルサイズは5MB以下にしてください" });
    const tooLarge = await POST(post(payload, { images: 2 }));
    expect(tooLarge.status).toBe(400);
    expect(mocks.remove).toHaveBeenCalledWith(["/uploads/first.webp"]);
    expect(mocks.product.create).not.toHaveBeenCalled();
  });

  it("DB への保存に失敗したら、書き込んだ画像を消す", async () => {
    mocks.product.create.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(post(payload));
    expect(response.status).toBe(500);
    expect(mocks.remove).toHaveBeenCalledWith(["/uploads/new-1.webp"]);
  });
});

describe("設計ツール連携: 状態の取得", () => {
  const get = (query: string, secret = SECRET) => new NextRequest(
    `http://next_app:3000/api/integrations/designer/products${query}`,
    { headers: { authorization: `Bearer ${secret}` } },
  );

  it("設計に紐づく商品の公開状態を返す", async () => {
    mocks.product.findUnique.mockResolvedValue({ id: 40, isPublished: true });
    const response = await GET(get("?designerDesignId=12"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: 40, isPublished: true });
  });

  it("未登録は 404、ID不正は 400、認証失敗は 401", async () => {
    expect((await GET(get("?designerDesignId=12"))).status).toBe(404);
    expect((await GET(get("?designerDesignId=abc"))).status).toBe(400);
    expect((await GET(get("?designerDesignId=12", "wrong"))).status).toBe(401);
  });
});

describe("設計ツール連携: 対応スリーブ", () => {
  const sleeve = {
    name: "フルプロテクトスリーブ R(レギュラー)サイズ",
    maker: "河島製作所",
    widthMm: 71,
    heightMm: 96,
    thicknessMm: 3,
    count: 16,
    discount: 1760,
  };

  it("設計のスリーブと値引き額を商品に保存する", async () => {
    const response = await POST(post({ ...payload, sleeve }));
    expect(response.status).toBe(201);
    expect(mocks.product.create.mock.calls[0][0].data.sleeve).toEqual(sleeve);
  });

  it("スリーブを送らない更新では、HP で入れた対応スリーブを変えない", async () => {
    mocks.product.findUnique.mockResolvedValue({ id: 40, images: [] });
    await POST(post(payload, { images: 0 }));
    expect(mocks.product.update.mock.calls[0][0].data.sleeve).toBeUndefined();
  });

  it("不正なスリーブ（寸法0・枚数が小数）は 400 で保存しない", async () => {
    expect((await POST(post({ ...payload, sleeve: { ...sleeve, widthMm: 0 } }))).status).toBe(400);
    expect((await POST(post({ ...payload, sleeve: { ...sleeve, count: 1.5 } }))).status).toBe(400);
    expect(mocks.product.create).not.toHaveBeenCalled();
  });
});
