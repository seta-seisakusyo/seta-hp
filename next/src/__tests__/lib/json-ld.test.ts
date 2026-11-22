import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("データ中の </script> でスクリプトタグを閉じられない", () => {
    const json = serializeJsonLd({ name: '</script><script>alert("x")</script>' });
    expect(json).not.toMatch(/<\/script/i);
    expect(json).not.toContain("<");
    expect(json).not.toContain(">");
  });

  it("大文字小文字を混ぜた </ScRiPt> も閉じられない", () => {
    expect(serializeJsonLd({ name: "</ScRiPt >" })).not.toMatch(/<\//);
  });

  it("HTML コメントの開始 <!-- と終了 --> を残さない", () => {
    const json = serializeJsonLd({ description: "<!-- <script> -->" });
    expect(json).not.toContain("<!--");
    expect(json).not.toContain("-->");
  });

  it("<, >, & を Unicode エスケープする", () => {
    expect(serializeJsonLd({ a: "<>&" })).toBe('{"a":"\\u003c\\u003e\\u0026"}');
  });

  it("キー名に含まれる < もエスケープする", () => {
    expect(serializeJsonLd({ "</script>": 1 })).toBe('{"\\u003c/script\\u003e":1}');
  });

  it("エスケープ後も JSON として元のデータに戻る", () => {
    const data = {
      "@context": "https://schema.org",
      name: "飾Love <カード> & \"ディスプレイ\" </script>",
      nested: [{ text: "a\u2028b\u2029c" }, 1, null, true],
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("文字列以外の値もそのまま JSON にする", () => {
    expect(serializeJsonLd(null)).toBe("null");
    expect(serializeJsonLd(42)).toBe("42");
    expect(serializeJsonLd([1, "x"])).toBe('[1,"x"]');
  });
});
