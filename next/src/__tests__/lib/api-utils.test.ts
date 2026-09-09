import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import {
  handleApiError,
  isErrorResponse,
  parseJsonWithSchema,
  sanitizeNullableText,
  sanitizeOptionalNullableText,
  sanitizeOptionalText,
} from "@/lib/api-utils";
import { RegistrationSchema } from "@/lib/validation";

describe("parseJsonWithSchema", () => {
  it("不正なJSONを400の同形レスポンスへ変換する", async () => {
    const request = new Request("http://localhost/api/register", {
      method: "POST",
      body: "{broken",
    });
    const result = await parseJsonWithSchema(request, RegistrationSchema);

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(400);
      expect(await result.json()).toEqual({ error: "リクエストボディが不正です" });
    }
  });
});

describe("テキストサニタイズ", () => {
  describe("sanitizeOptionalText", () => {
    it.each([
      ["abc", "abc"],
      ["", undefined],
      [null, undefined],
      [undefined, undefined],
    ])("%j を %j に変換する", (value, expected) => {
      expect(sanitizeOptionalText(value as string | undefined)).toBe(expected);
    });
  });

  describe("sanitizeNullableText", () => {
    it.each([
      ["abc", "abc"],
      ["", null],
      [null, null],
      [undefined, null],
    ])("%j を %j に変換する", (value, expected) => {
      expect(sanitizeNullableText(value)).toBe(expected);
    });
  });

  describe("sanitizeOptionalNullableText", () => {
    it.each([
      ["abc", "abc"],
      ["", null],
      [null, null],
      [undefined, undefined],
    ])("%j を %j に変換する", (value, expected) => {
      expect(sanitizeOptionalNullableText(value)).toBe(expected);
    });
  });
});

describe("handleApiError", () => {
  const options = {
    log: "test",
    message: "失敗しました",
    notFoundMessage: "見つかりません",
    uniqueConstraintMessage: "既に存在します",
  };

  it("P2025を404へ変換する", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("missing", {
      code: "P2025",
      clientVersion: "test",
    });
    const response = handleApiError(error, options);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "見つかりません" });
  });

  it("P2002を既存契約の400へ変換する", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "test",
    });
    const response = handleApiError(error, options);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "既に存在します" });
  });
});
