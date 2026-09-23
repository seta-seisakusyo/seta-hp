import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string): never => { throw new Error(`redirect:${url}`); }),
}));
import { auth } from "@/lib/auth";
import { requireAdmin, requireAdminOrEditor } from "@/lib/admin-auth";
const mockAuth = vi.mocked(auth);
beforeEach(() => vi.clearAllMocks());

for (const guard of [requireAdmin, requireAdminOrEditor]) {
  describe(guard.name, () => {
    it.each([null, {}])("ユーザーなしならログインへ戻す: %j", async (session) => {
      mockAuth.mockResolvedValue(session as never);
      await expect(guard()).rejects.toThrow("redirect:/login");
    });

    it.each(["ADMIN", "EDITOR", "VIEWER", "unknown"])("権限に従ってページを保護する: %s", async (role) => {
      const session = { user: { role } };
      mockAuth.mockResolvedValue(session as never);
      if (role === "ADMIN" || (guard === requireAdminOrEditor && role === "EDITOR")) {
        await expect(guard()).resolves.toBe(session);
      } else {
        await expect(guard()).rejects.toThrow("redirect:/");
      }
    });
  });
}
