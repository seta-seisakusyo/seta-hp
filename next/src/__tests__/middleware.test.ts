import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// NextAuth(config).auth(handler) は、セッションを req.auth に載せて handler を呼ぶ。
// テストでは req.auth を直接渡すので、handler をそのまま返す。
vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));

import middleware, { config } from "@/middleware";
import { decideManageAccess, findManageRoute, MANAGE_ROUTES } from "@/lib/manage-routes";

type Handler = (req: { nextUrl: URL; auth: unknown }) => Response | undefined;
const run = middleware as unknown as Handler;

function request(pathname: string, role?: string) {
  return {
    nextUrl: new URL(pathname, "https://kaza-love.com"),
    auth: role === undefined ? null : { user: { role } },
  };
}

describe("middleware の配置", () => {
  // アプリが src/app にあるため、Next.js は src/middleware.ts しか読まない（#405）
  it("src/middleware.ts にあり、プロジェクト直下には置かない", () => {
    const root = path.resolve(__dirname, "../..");
    expect(existsSync(path.join(root, "src/middleware.ts"))).toBe(true);
    expect(existsSync(path.join(root, "middleware.ts"))).toBe(false);
  });
});

describe("config.matcher", () => {
  it("MANAGE_ROUTES と一致する", () => {
    expect([...config.matcher].sort()).toEqual(
      MANAGE_ROUTES.map((route) => `${route.path}/:path*`).sort()
    );
  });

  it("/x-post は ADMIN のみ、他の管理ページは EDITOR 以上", () => {
    expect(Object.fromEntries(MANAGE_ROUTES.map((r) => [r.path, r.role]))).toEqual({
      "/products-manage": "EDITOR",
      "/gallery-manage": "EDITOR",
      "/news": "EDITOR",
      "/x-post": "ADMIN",
    });
  });
});

describe("findManageRoute", () => {
  it.each([
    ["/news", "/news"],
    ["/news/1", "/news"],
    ["/x-post", "/x-post"],
    ["/products-manage/edit", "/products-manage"],
  ])("%s は %s の管理ページ", (pathname, expected) => {
    expect(findManageRoute(pathname)?.path).toBe(expected);
  });

  it.each(["/", "/newsletter", "/x-posts", "/products", "/gallery"])(
    "%s は管理ページではない",
    (pathname) => {
      expect(findManageRoute(pathname)).toBeUndefined();
    }
  );
});

describe("decideManageAccess", () => {
  const editorPages = ["/products-manage", "/gallery-manage", "/news"];

  it.each([...editorPages, "/x-post"])("未ログインで %s はログインへ", (pathname) => {
    expect(decideManageAccess(pathname, null)).toEqual({ type: "redirect", to: "/login" });
    expect(decideManageAccess(pathname, {})).toEqual({ type: "redirect", to: "/login" });
  });

  it.each(editorPages)("%s は ADMIN と EDITOR が開ける", (pathname) => {
    expect(decideManageAccess(pathname, { user: { role: "ADMIN" } })).toEqual({ type: "allow" });
    expect(decideManageAccess(pathname, { user: { role: "EDITOR" } })).toEqual({ type: "allow" });
  });

  it.each([...editorPages, "/x-post"])("VIEWER・不明な権限で %s はトップへ", (pathname) => {
    for (const role of ["VIEWER", "unknown", undefined]) {
      expect(decideManageAccess(pathname, { user: { role } })).toEqual({ type: "redirect", to: "/" });
    }
  });

  it("/x-post は EDITOR ではトップへ、ADMIN は開ける", () => {
    expect(decideManageAccess("/x-post", { user: { role: "EDITOR" } })).toEqual({
      type: "redirect",
      to: "/",
    });
    expect(decideManageAccess("/x-post", { user: { role: "ADMIN" } })).toEqual({ type: "allow" });
  });

  it("表にないパスは判定しない", () => {
    expect(decideManageAccess("/company", null)).toEqual({ type: "allow" });
  });
});

describe("middleware", () => {
  it.each([
    ["/products-manage", undefined, "https://kaza-love.com/login"],
    ["/x-post", undefined, "https://kaza-love.com/login"],
    ["/x-post", "EDITOR", "https://kaza-love.com/"],
    ["/news", "VIEWER", "https://kaza-love.com/"],
  ])("%s (role=%s) は %s へリダイレクト", (pathname, role, location) => {
    const res = run(request(pathname, role));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe(location);
  });

  it.each([
    ["/x-post", "ADMIN"],
    ["/gallery-manage", "EDITOR"],
  ])("%s は %s なら通す", (pathname, role) => {
    expect(run(request(pathname, role))).toBeUndefined();
  });
});
