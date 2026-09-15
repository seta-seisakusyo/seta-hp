import "server-only";

interface RecaptchaVerifyResult {
  success: boolean;
  // 失敗時にAPIが返すべきHTTPステータス（成功時は200）
  status: number;
  message?: string;
}

// reCAPTCHA v3 のスコア閾値。これ未満は自動化された挙動とみなす。
const RECAPTCHA_MIN_SCORE = 0.5;

/**
 * reCAPTCHA v3 トークンを Google の siteverify で検証する。
 *
 * 保護対象の処理（メール送信など）から直接呼び出すことで、
 * 「チャレンジ通過」と「実際の副作用のある処理」を確実に結びつける。
 * 検証を別エンドポイントに委ねると、そのエンドポイントを経由しない直接POSTで
 * 保護を回避できてしまうため、必ず処理と同じハンドラ内で検証する。
 */
export async function verifyRecaptchaToken(
  token: unknown,
  expectedAction?: string
): Promise<RecaptchaVerifyResult> {
  if (typeof token !== "string" || token.length === 0) {
    return { success: false, status: 400, message: "No token provided" };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // 秘密鍵未設定では検証不能。空文字で送ると Google は常に失敗を返すため、明示的にfail-closed。
    return { success: false, status: 500, message: "reCAPTCHA is not configured" };
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?${params}`,
      { method: "POST" }
    );
    if (!response.ok) {
      throw new Error(`siteverify応答エラー: HTTP ${response.status}`);
    }

    const { success, score, action, hostname } = await response.json();

    if (!success) {
      return { success: false, status: 400, message: "Invalid token" };
    }

    // action検証（指定された場合のみ）
    if (expectedAction && action !== expectedAction) {
      return { success: false, status: 400, message: "Action mismatch" };
    }

    // hostname検証（環境変数で許可ホストが指定された場合のみ）
    const allowedHostnames =
      process.env.ALLOWED_RECAPTCHA_HOSTNAMES?.split(",")
        .map((h) => h.trim())
        .filter(Boolean) ?? [];
    if (allowedHostnames.length > 0 && !allowedHostnames.includes(hostname)) {
      return { success: false, status: 400, message: "Invalid hostname" };
    }

    // score が数値でない/閾値未満は失敗扱い（undefined < 0.5 が false で素通りする穴を塞ぐ）
    if (typeof score !== "number" || score < RECAPTCHA_MIN_SCORE) {
      return { success: false, status: 403, message: "Low score, verification failed" };
    }

    return { success: true, status: 200 };
  } catch (error) {
    console.error("reCAPTCHA 検証エラー:", error);
    return { success: false, status: 500, message: "reCAPTCHA 検証に失敗しました。" };
  }
}
