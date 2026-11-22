import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ executeRaw: vi.fn(), queryRaw: vi.fn() }));
vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({ $executeRaw: mocks.executeRaw, $queryRaw: mocks.queryRaw }),
}));

import { checkRateLimit } from "@/lib/rate-limit";

const config = { limit: 3, windowMs: 60_000 };
let keySeq = 0;
const uniqueKey = () => `db-test:${++keySeq}`;

/** タグ付きテンプレートの呼び出しから SQL 文（? で連結）と値を取り出す。 */
function sqlOf(call: unknown[]) {
  const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
  return { sql: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RATE_LIMIT_STORE", "database");
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.executeRaw.mockResolvedValue(1);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("DB のレート制限", () => {
  it("キーごとに UPSERT してから件数を読み、上限内なら成功", async () => {
    const resetAt = new Date("2026-11-22T00:01:00Z");
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt }]);
    const key = uniqueKey();

    expect(await checkRateLimit(key, config)).toEqual({ success: true, remaining: 2, resetAt: resetAt.getTime() });

    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
    const upsert = sqlOf(mocks.executeRaw.mock.calls[0]);
    expect(upsert.sql).toMatch(/^INSERT INTO ApiRateLimit .* ON DUPLICATE KEY UPDATE/);
    expect(upsert.values[0]).toBe(key);
    expect(upsert.values[1]).toBeInstanceOf(Date);

    const select = sqlOf(mocks.queryRaw.mock.calls[0]);
    expect(select.sql).toMatch(/^SELECT count, resetAt FROM ApiRateLimit WHERE identifier = \? LIMIT 1$/);
    expect(select.values).toEqual([key]);
  });

  it("新しい期限は現在時刻＋ウィンドウ", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(0) }]);
    const before = Date.now();
    await checkRateLimit(uniqueKey(), config);
    const after = Date.now();
    const { values } = sqlOf(mocks.executeRaw.mock.calls[0]);
    const resetAt = (values[1] as Date).getTime();
    expect(resetAt).toBeGreaterThanOrEqual(before + config.windowMs);
    expect(resetAt).toBeLessThanOrEqual(after + config.windowMs);
    // 期限切れの行を作り直すときも同じ期限を使う
    expect(values[2]).toBe(values[1]);
  });

  it("件数がちょうど上限なら成功で残り0", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 3, resetAt: new Date(0) }]);
    expect(await checkRateLimit(uniqueKey(), config)).toMatchObject({ success: true, remaining: 0 });
  });

  it("件数が上限を超えたら失敗", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 4, resetAt: new Date(0) }]);
    expect(await checkRateLimit(uniqueKey(), config)).toMatchObject({ success: false, remaining: 0 });
  });

  it("期限が文字列で返っても数値の時刻にする", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: "2026-11-22T00:01:00.000Z" }]);
    expect((await checkRateLimit(uniqueKey(), config)).resetAt).toBe(Date.parse("2026-11-22T00:01:00.000Z"));
  });

  it("1% の確率で期限切れの行を掃除する", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(0) }]);
    await checkRateLimit(uniqueKey(), config);
    expect(mocks.executeRaw).toHaveBeenCalledTimes(2);
    expect(sqlOf(mocks.executeRaw.mock.calls[0]).sql).toBe("DELETE FROM ApiRateLimit WHERE resetAt < ?");
  });

  it("掃除に失敗しても判定は続ける", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    mocks.executeRaw.mockRejectedValueOnce(new Error("cleanup failed"));
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(0) }]);
    expect(await checkRateLimit(uniqueKey(), config)).toMatchObject({ success: true, remaining: 2 });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("DB からメモリへの切り替え", () => {
  it("DB が使えなければメモリで数え、上限を超えたら失敗にする（警告は一度だけ）", async () => {
    mocks.executeRaw.mockRejectedValue(new Error("DB down"));
    const key = uniqueKey();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await checkRateLimit(key, config));

    expect(results.map((r) => r.success)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("UPSERT 後に行が読めなければメモリで数える", async () => {
    mocks.queryRaw.mockResolvedValue([]);
    expect(await checkRateLimit(uniqueKey(), config)).toMatchObject({ success: true, remaining: 2 });
  });
});

describe("保存先の選び方", () => {
  it("RATE_LIMIT_STORE=memory なら DB に触れない", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "memory");
    await checkRateLimit(uniqueKey(), config);
    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });

  it("未設定ならテスト環境ではメモリ", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "mysql://localhost/db");
    await checkRateLimit(uniqueKey(), config);
    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });

  it("未設定なら DATABASE_URL があるときだけ DB", async () => {
    vi.stubEnv("RATE_LIMIT_STORE", "");
    vi.stubEnv("NODE_ENV", "production");
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(0) }]);

    vi.stubEnv("DATABASE_URL", "");
    await checkRateLimit(uniqueKey(), config);
    expect(mocks.executeRaw).not.toHaveBeenCalled();

    vi.stubEnv("DATABASE_URL", "mysql://localhost/db");
    await checkRateLimit(uniqueKey(), config);
    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
  });
});
