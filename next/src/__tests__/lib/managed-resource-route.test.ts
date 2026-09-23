import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import {
  deleteManagedResource,
  getPublishedListParams,
} from "@/lib/managed-resource-route";
import { isErrorResponse } from "@/lib/api-utils";

const mockAuth = vi.mocked(auth);

describe("getPublishedListParams", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("公開一覧は認証せずページネーションを返す", async () => {
    const req = new NextRequest("http://localhost/api/products?page=2&limit=10");
    const result = await getPublishedListParams(req);

    expect(isErrorResponse(result)).toBe(false);
    if (!isErrorResponse(result)) {
      expect(result).toEqual({
        includeUnpublished: false,
        page: 2,
        limit: 10,
        skip: 10,
      });
    }
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("非公開を含む一覧はEDITOR以上だけを許可する", async () => {
    mockAuth.mockResolvedValue({ user: { role: "VIEWER" } } as never);
    const denied = await getPublishedListParams(
      new NextRequest("http://localhost/api/products?includeUnpublished=true")
    );
    expect(isErrorResponse(denied)).toBe(true);
    if (isErrorResponse(denied)) expect(denied.status).toBe(403);

    mockAuth.mockResolvedValue({ user: { role: "EDITOR" } } as never);
    const allowed = await getPublishedListParams(
      new NextRequest("http://localhost/api/products?includeUnpublished=true")
    );
    expect(isErrorResponse(allowed)).toBe(false);
    if (!isErrorResponse(allowed)) expect(allowed.includeUnpublished).toBe(true);
  });
});

describe("deleteManagedResource", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("ADMIN認証、ID検証、削除、後処理を順に実行する", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } } as never);
    const existing = { id: 7, image: "/uploads/old.webp" };
    const deleteById = vi.fn().mockResolvedValue(existing);
    const afterDelete = vi.fn().mockResolvedValue(undefined);

    const response = await deleteManagedResource(
      new NextRequest("http://localhost/api/products", {
        method: "DELETE",
        body: JSON.stringify({ id: 7 }),
      }),
      {
        deleteById,
        afterDelete,
        notFoundMessage: "見つかりません",
        errorLog: "削除エラー",
        errorMessage: "削除に失敗しました",
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(deleteById).toHaveBeenCalledWith(7);
    expect(afterDelete).toHaveBeenCalledWith(existing);
  });

  it("削除対象がなければPrismaの結果を404へ変換する", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } } as never);
    const deleteById = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("missing", {
      code: "P2025", clientVersion: "test",
    }));
    const afterDelete = vi.fn();
    const response = await deleteManagedResource(
      new NextRequest("http://localhost/api/news", {
        method: "DELETE",
        body: JSON.stringify({ id: 99 }),
      }),
      {
        afterDelete,
        deleteById,
        notFoundMessage: "見つかりません",
        errorLog: "削除エラー",
        errorMessage: "削除に失敗しました",
      }
    );

    expect(response.status).toBe(404);
    expect(afterDelete).not.toHaveBeenCalled();
  });

  it.each([null, "VIEWER", "EDITOR"])("権限不足なら削除しない: %s", async (role) => {
    mockAuth.mockResolvedValue((role ? { user: { role } } : null) as never);
    const deleteById = vi.fn();
    const response = await deleteManagedResource(
      new NextRequest("http://localhost/api/products", { method: "DELETE", body: '{"id":1}' }),
      { deleteById, notFoundMessage: "なし", errorLog: "削除エラー", errorMessage: "失敗" }
    );
    expect(response.status).toBe(role ? 403 : 401);
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("不正なIDは削除前に拒否する", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } } as never);
    const deleteById = vi.fn();
    const response = await deleteManagedResource(
      new NextRequest("http://localhost/api/products", { method: "DELETE", body: '{"id":0}' }),
      { deleteById, notFoundMessage: "なし", errorLog: "削除エラー", errorMessage: "失敗" }
    );
    expect(response.status).toBe(400);
    expect(deleteById).not.toHaveBeenCalled();
  });

});
