import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, prismaError, roleCases, sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  news: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ news: mocks.news }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

import { DELETE as deleteNews, GET as listNews, POST as createNews, PUT as updateNews } from "@/app/api/news/route";

const url = "http://localhost/api/news";
const validCreate = { title: "お知らせ", contents: "本文", date: "2026-09-23" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(sessionFor("ADMIN"));
  mocks.news.findMany.mockResolvedValue([{ id: 1, title: "A" }]);
  mocks.news.count.mockResolvedValue(1);
  mocks.news.create.mockResolvedValue({ id: 1 });
  mocks.news.update.mockResolvedValue({ id: 1 });
  mocks.news.delete.mockResolvedValue({ id: 1 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("お知らせ一覧（GET）", () => {
  it("未ログインでも取得でき、日付の新しい順で返す", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await listNews(new NextRequest(url));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ news: [{ id: 1, title: "A" }], total: 1, page: 1 });
    expect(mocks.news.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { date: "desc" } }));
  });

  it("page・limit でページ分けする", async () => {
    const response = await listNews(new NextRequest(`${url}?page=2&limit=5`));
    expect(await response.json()).toMatchObject({ page: 2, limit: 5 });
    expect(mocks.news.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, skip: 5 }));
  });

  it("DB エラーは500", async () => {
    mocks.news.count.mockRejectedValue(new Error("down"));
    expect((await listNews(new NextRequest(url))).status).toBe(500);
  });
});

describe("お知らせの作成・更新の権限", () => {
  it.each(roleCases("EDITOR"))("作成: $label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    expect((await createNews(jsonRequest(url, "POST", validCreate))).status).toBe(status);
    expect(mocks.news.create).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it.each(roleCases("EDITOR"))("更新: $label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    expect((await updateNews(jsonRequest(url, "PUT", { id: 1, title: "更新" }))).status).toBe(status);
    expect(mocks.news.update).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });
});

describe("お知らせの作成・更新", () => {
  it("本文をサニタイズして { text } の形で保存する", async () => {
    await createNews(jsonRequest(url, "POST", { ...validCreate, contents: '<script>alert("x")</script>' }));
    const { contents } = mocks.news.create.mock.calls[0][0].data;
    expect(Object.keys(contents)).toEqual(["text"]);
    expect(contents.text).not.toContain("<script>");
    expect(contents.text).toContain("&lt;script&gt;");
  });

  it("更新で本文を送らなければ本文を変更しない", async () => {
    await updateNews(jsonRequest(url, "PUT", { id: 1, title: "更新" }));
    expect(mocks.news.update.mock.calls[0][0].data.contents).toBeUndefined();
  });

  it("存在しないお知らせの更新は404", async () => {
    mocks.news.update.mockRejectedValue(prismaError("P2025"));
    const response = await updateNews(jsonRequest(url, "PUT", { id: 999, title: "更新" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "指定されたお知らせが見つかりません" });
  });
});

describe("お知らせ削除（DELETE）", () => {
  it.each(roleCases("ADMIN"))("$label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    expect((await deleteNews(jsonRequest(url, "DELETE", { id: 1 }))).status).toBe(status);
    expect(mocks.news.delete).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it("存在しない ID は404", async () => {
    mocks.news.delete.mockRejectedValue(prismaError("P2025"));
    const response = await deleteNews(jsonRequest(url, "DELETE", { id: 999 }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "指定されたお知らせが見つかりません" });
  });
});
