import { describe, expect, it } from "vitest";
import { resolveGaMeasurementId } from "@/lib/analytics";

describe("resolveGaMeasurementId", () => {
  it("GA4形式の測定IDをそのまま返す", () => {
    expect(resolveGaMeasurementId("G-ABC1234567")).toBe("G-ABC1234567");
  });

  it("前後の空白を除去する", () => {
    expect(resolveGaMeasurementId("  G-ABC1234567  ")).toBe("G-ABC1234567");
  });

  it.each([undefined, null, "", "   "])("未設定・空文字は null を返す (%s)", (value) => {
    expect(resolveGaMeasurementId(value)).toBeNull();
  });

  it.each([
    "UA-12345678-1", // 旧ユニバーサルアナリティクス
    "G-abc1234567", // 小文字は GA4 の表記ではない
    "GTM-ABC1234", // タグマネージャのID
    "G-ABC", // 短すぎる
    "ABC1234567",
  ])("GA4形式でない値は null を返す (%s)", (value) => {
    expect(resolveGaMeasurementId(value)).toBeNull();
  });

  it("インラインスクリプトを破壊しうる文字列を弾く", () => {
    expect(resolveGaMeasurementId("G-ABC123');alert(1);//")).toBeNull();
    expect(resolveGaMeasurementId("G-ABC123</script>")).toBeNull();
  });
});
