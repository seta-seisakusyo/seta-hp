import bcryptjs from "bcryptjs";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, prismaError } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  enforceRateLimit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({ user: { findUnique: mocks.findUnique, create: mocks.create } }),
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  RATE_LIMITS: { register: { limit: 5, windowMs: 3_600_000 } },
}));

import { POST as register } from "@/app/api/register/route";

const valid = { name: "山田太郎", email: "user@example.com", password: "Passw0rdX" };
const request = (body: unknown) => jsonRequest("http://localhost/api/register", "POST", body);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enforceRateLimit.mockResolvedValue({ limited: null, result: { success: true, remaining: 4, resetAt: 1_700_000_000_000 } });
  mocks.findUnique.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ id: "new-user" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ユーザー登録", () => {
  it("201 とレート制限の残り回数を返し、既定の権限 VIEWER で作成する", async () => {
    const response = await register(request(valid));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000000000");
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: valid.email }, select: { id: true } });
    const data = mocks.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: valid.name, email: valid.email, role: "VIEWER" });
  });

  it("パスワードは平文ではなく bcrypt のハッシュで保存する", async () => {
    await register(request(valid));
    const { password } = mocks.create.mock.calls[0][0].data;
    expect(password).not.toBe(valid.password);
    expect(password).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcryptjs.compare(valid.password, password)).toBe(true);
  });

  it("本文で権限を指定しても VIEWER で作成する", async () => {
    await register(request({ ...valid, role: "ADMIN" }));
    expect(mocks.create.mock.calls[0][0].data.role).toBe("VIEWER");
  });

  it("登録済みのメールアドレスは400にし、作成しない（存在を明かさない文言）", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    const response = await register(request(valid));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "アカウントの作成に失敗しました" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("同時登録で一意制約違反（P2002）になっても同じ400にする", async () => {
    mocks.create.mockRejectedValue(prismaError("P2002"));
    const response = await register(request(valid));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "アカウントの作成に失敗しました" });
  });

  it("予期しない DB エラーは500", async () => {
    mocks.findUnique.mockRejectedValue(new Error("connection lost"));
    expect((await register(request(valid))).status).toBe(500);
  });

  it.each([
    { ...valid, password: "short1A" },
    { ...valid, password: "alllowercase1" },
    { ...valid, email: "not-an-email" },
    { ...valid, name: "" },
    null,
  ])("不正な入力は DB に触れず400: %j", async (body) => {
    expect((await register(request(body))).status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("レート制限を超えたら、入力を読む前に429を返す", async () => {
    const limited = NextResponse.json({ success: false }, { status: 429 });
    mocks.enforceRateLimit.mockResolvedValue({ limited, result: { success: false, remaining: 0, resetAt: 0 } });
    const response = await register(request(valid));
    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      "register",
      { limit: 5, windowMs: 3_600_000 },
      expect.any(String)
    );
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
