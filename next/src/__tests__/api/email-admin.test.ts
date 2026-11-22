import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, prismaError, roleCases, sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  inquiry: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), delete: vi.fn() },
  sendMail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ inquiry: mocks.inquiry }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ limited: null }),
  RATE_LIMITS: { contact: {} },
}));
vi.mock("@/lib/runtime-config", () => ({ isRecaptchaEnabled: () => false }));
vi.mock("@/lib/recaptcha", () => ({ verifyRecaptchaToken: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail }) } }));

import { DELETE as deleteInquiry, GET as listInquiries, POST as submitInquiry } from "@/app/api/email/route";

const list = (query = "") => new NextRequest(`http://localhost/api/email${query}`);
const remove = (body: unknown) => jsonRequest("http://localhost/api/email", "DELETE", body);
const inquiries = [{ id: 2, name: "B" }, { id: 1, name: "A" }];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(sessionFor("ADMIN"));
  mocks.inquiry.findMany.mockResolvedValue(inquiries);
  mocks.inquiry.count.mockResolvedValue(42);
  mocks.inquiry.delete.mockResolvedValue({ id: 1 });
  mocks.inquiry.create.mockResolvedValue({ id: 1, createdAt: new Date() });
  mocks.sendMail.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // SMTP_USER が未設定だと mailer は送信前に止まる（#409）。送信の成否を試すため設定しておく。
  vi.stubEnv("SMTP_USER", "smtp@example.com");
  vi.stubEnv("CONTACT_TO_EMAIL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("問い合わせ一覧（GET）", () => {
  it.each(roleCases("ADMIN"))("$label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await listInquiries(list());
    expect(response.status).toBe(status);
    expect(mocks.inquiry.findMany).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it("ページ指定がなければ新しい順に全件返す", async () => {
    const response = await listInquiries(list());
    expect(await response.json()).toEqual({ inquiries, total: 42, page: 1 });
    expect(mocks.inquiry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: "desc" },
      take: undefined,
      skip: undefined,
    }));
  });

  it("page・limit でページ分けする", async () => {
    const response = await listInquiries(list("?page=3&limit=10"));
    expect(await response.json()).toMatchObject({ total: 42, page: 3, limit: 10 });
    expect(mocks.inquiry.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10, skip: 20 }));
  });

  it("limit の上限は100", async () => {
    await listInquiries(list("?limit=1000"));
    expect(mocks.inquiry.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, skip: 0 }));
  });

  it("DB エラーは500", async () => {
    mocks.inquiry.findMany.mockRejectedValue(new Error("down"));
    expect((await listInquiries(list())).status).toBe(500);
  });
});

describe("問い合わせ削除（DELETE）", () => {
  it.each(roleCases("ADMIN"))("$label → $status", async ({ role, allowed, status }) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await deleteInquiry(remove({ id: 1 }));
    expect(response.status).toBe(status);
    expect(mocks.inquiry.delete).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it("指定した ID を削除する", async () => {
    await deleteInquiry(remove({ id: 7 }));
    expect(mocks.inquiry.delete).toHaveBeenCalledWith({ where: { id: 7 }, select: { id: true } });
  });

  it("存在しない ID は404", async () => {
    mocks.inquiry.delete.mockRejectedValue(prismaError("P2025"));
    const response = await deleteInquiry(remove({ id: 999 }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "指定された問い合わせが見つかりません" });
  });

  it.each([{}, { id: "abc" }, { id: 0 }])("不正な ID は400: %j", async (body) => {
    expect((await deleteInquiry(remove(body))).status).toBe(400);
    expect(mocks.inquiry.delete).not.toHaveBeenCalled();
  });
});

describe("問い合わせ送信（POST）のメール送信失敗", () => {
  const valid = { name: "山田太郎", email: "test@example.com", inquiry: "お問い合わせです" };

  it("メール送信に失敗しても、DB に保存できていれば成功を返す", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP down"));
    const response = await submitInquiry(jsonRequest("http://localhost/api/email", "POST", valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.inquiry.create).toHaveBeenCalledTimes(1);
  });

  it("管理者宛が失敗したら自動返信は送らない", async () => {
    mocks.sendMail.mockRejectedValueOnce(new Error("SMTP down"));
    await submitInquiry(jsonRequest("http://localhost/api/email", "POST", valid));
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });

  it("DB への保存に失敗したら500で、メールは送らない", async () => {
    mocks.inquiry.create.mockRejectedValue(new Error("down"));
    const response = await submitInquiry(jsonRequest("http://localhost/api/email", "POST", valid));
    expect(response.status).toBe(500);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
