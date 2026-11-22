import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleAuthEnabled, isRecaptchaEnabled } from "@/lib/runtime-config";

afterEach(() => vi.unstubAllEnvs());

function stubEnv(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

describe("isGoogleAuthEnabled", () => {
  const all = {
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
  };

  it("3つそろえば有効", () => {
    stubEnv(all);
    expect(isGoogleAuthEnabled()).toBe(true);
  });

  it.each(Object.keys(all))("%s が欠けていれば無効", (missing) => {
    stubEnv({ ...all, [missing]: "" });
    expect(isGoogleAuthEnabled()).toBe(false);
  });

  it.each(["TRUE", "1", "yes"])("有効フラグは文字列 true のときだけ: %s", (flag) => {
    stubEnv({ ...all, NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: flag });
    expect(isGoogleAuthEnabled()).toBe(false);
  });
});

describe("isRecaptchaEnabled", () => {
  it("サイトキーと秘密鍵がそろえば有効", () => {
    stubEnv({ NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site", RECAPTCHA_SECRET_KEY: "secret" });
    expect(isRecaptchaEnabled()).toBe(true);
  });

  it.each([
    { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site", RECAPTCHA_SECRET_KEY: "" },
    { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "", RECAPTCHA_SECRET_KEY: "secret" },
    { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "", RECAPTCHA_SECRET_KEY: "" },
  ])("片方でも欠けていれば無効: %j", (env) => {
    stubEnv(env);
    expect(isRecaptchaEnabled()).toBe(false);
  });
});
