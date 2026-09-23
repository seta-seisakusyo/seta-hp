import { describe, it, expect } from "vitest";
import { parsePagination } from "@/lib/pagination";

describe("parsePagination", () => {
  it("パラメータ未指定で全件取得（既存互換）", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result).toEqual({ page: 1, limit: undefined, skip: undefined });
  });

  it("page指定でデフォルトlimit=50", () => {
    const params = new URLSearchParams("page=2");
    const result = parsePagination(params);
    expect(result).toEqual({ page: 2, limit: 50, skip: 50 });
  });

  it("pageとlimit両方指定", () => {
    const params = new URLSearchParams("page=3&limit=20");
    const result = parsePagination(params);
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it("limit単独指定でpage=1", () => {
    const params = new URLSearchParams("limit=10");
    const result = parsePagination(params);
    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("limitが100を超える場合は100にクランプ", () => {
    const params = new URLSearchParams("page=1&limit=999");
    const result = parsePagination(params);
    expect(result.limit).toBe(100);
  });

  it("pageが0以下の場合は1にフォールバック", () => {
    const params = new URLSearchParams("page=0&limit=10");
    expect(parsePagination(params).page).toBe(1);

    const params2 = new URLSearchParams("page=-5&limit=10");
    expect(parsePagination(params2).page).toBe(1);
  });

  it("limitが0以下の場合はデフォルトにフォールバック", () => {
    const params = new URLSearchParams("page=1&limit=0");
    expect(parsePagination(params).limit).toBe(50);

    const params2 = new URLSearchParams("page=1&limit=-1");
    expect(parsePagination(params2).limit).toBe(50);
  });

  it("NaN入力でフォールバック", () => {
    const params = new URLSearchParams("page=abc&limit=xyz");
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("page=1の場合skip=0", () => {
    const params = new URLSearchParams("page=1&limit=25");
    expect(parsePagination(params).skip).toBe(0);
  });
});

it.each(["1" + "0".repeat(307), "2147483647", "1e3", "2.5", "2abc"])("不正または乗算後に範囲外のページを先頭へ戻す: %s", (page) => {
  expect(parsePagination(new URLSearchParams({ page, limit: "100" }))).toEqual({ page: 1, limit: 100, skip: 0 });
});
it("最大の有効なオフセットを範囲内で計算する", () => {
  expect(parsePagination(new URLSearchParams("page=21474837&limit=100"))).toEqual({ page: 21474837, limit: 100, skip: 2147483600 });
});
