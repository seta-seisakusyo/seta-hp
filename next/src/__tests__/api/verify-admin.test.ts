import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionFor } from "../helpers/api";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

import { GET as verifyAdmin } from "@/app/api/auth/verify-admin/route";

const IDENTITY_HEADERS = ["X-User-Email", "X-User-Id", "X-User-Role"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SSO_VERIFY_ENABLED", "1");
});

afterEach(() => vi.unstubAllEnvs());

describe("管理者検証（Designer SSO の関門）", () => {
  it.each(["", "0", "true", "yes"])("SSO_VERIFY_ENABLED=%j なら ADMIN でも403で、セッションを読まない", async (value) => {
    vi.stubEnv("SSO_VERIFY_ENABLED", value);
    mocks.auth.mockResolvedValue(sessionFor("ADMIN"));
    const response = await verifyAdmin();
    expect(response.status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
    for (const name of IDENTITY_HEADERS) expect(response.headers.get(name)).toBeNull();
  });

  it("未ログインは401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await verifyAdmin();
    expect(response.status).toBe(401);
    for (const name of IDENTITY_HEADERS) expect(response.headers.get(name)).toBeNull();
  });

  it.each(["VIEWER", "EDITOR"] as const)("%s は403で身元を返さない", async (role) => {
    mocks.auth.mockResolvedValue(sessionFor(role));
    const response = await verifyAdmin();
    expect(response.status).toBe(403);
    for (const name of IDENTITY_HEADERS) expect(response.headers.get(name)).toBeNull();
  });

  it("ADMIN は200で、本文なし・身元ヘッダー付き", async () => {
    mocks.auth.mockResolvedValue(sessionFor("ADMIN"));
    const response = await verifyAdmin();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("X-User-Email")).toBe("admin@example.com");
    expect(response.headers.get("X-User-Id")).toBe("user-admin");
    expect(response.headers.get("X-User-Role")).toBe("ADMIN");
  });

  it("メールアドレスのない ADMIN は空のヘッダーにする", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    const response = await verifyAdmin();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-User-Email")).toBe("");
    expect(response.headers.get("X-User-Id")).toBe("a1");
  });
});
