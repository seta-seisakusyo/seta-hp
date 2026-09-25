import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/api-response";

/** 1回の登録で受け取る画像の上限（メイン＋寸法図＋予備）。 */
export const DESIGNER_PRODUCT_MAX_IMAGES = 6;

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // 長さが違うと timingSafeEqual が例外を投げるので先に弾く（長さは秘密ではない）。
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * 設計ツール（designer.kaza-love.com のバックエンド）からの呼び出しかを確かめる。
 * `Authorization: Bearer <DESIGNER_API_SECRET>` を定数時間比較する。
 * 秘密が未設定の環境では連携そのものを無効にする（503）。
 * 通過なら null、拒否ならそのまま返すレスポンスを返す。
 */
export function verifyDesignerRequest(req: Request): NextResponse | null {
  const expected = process.env.DESIGNER_API_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "設計ツール連携が設定されていません" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !sameSecret(match[1].trim(), expected)) {
    return unauthorizedResponse("設計ツール連携の認証に失敗しました");
  }
  return null;
}
