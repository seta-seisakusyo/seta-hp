import { describe, expect, it } from "vitest";
import { parsePositiveId } from "@/lib/parse-id";

describe("parsePositiveId", () => {
  it.each(["1", "123", "001", "2147483647"])("accepts a decimal ID: %s", (raw) => {
    expect(parsePositiveId(raw)).toBe(Number(raw));
  });
  it.each([null, "", "0", "-1", "1abc", "1.5", "1e3", "0x10", "+1", " 1", "1 ", "Infinity", "2147483648", "9007199254740993"])(
    "rejects malformed or unsafe IDs: %s", (raw) => {
      expect(parsePositiveId(raw)).toBeNull();
    }
  );
});
