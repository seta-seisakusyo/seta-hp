import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NONCE_HEX = "00112233445566778899aabbccddeeff";

// nonce を固定して署名を再現できるようにする。HMAC は本物を使う。
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  const randomBytes = () => Buffer.from(NONCE_HEX, "hex");
  return { ...actual, default: { ...actual, randomBytes }, randomBytes };
});

import { getXCredentials, postToX, uploadMedia } from "@/lib/x-client";

// X の「Creating a signature」ドキュメントの資格情報の例
const credentials = {
  apiKey: "xvz1evFS4wEEPTGEFPHBog",
  apiSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
  accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
  accessTokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
};
const TIMESTAMP = 1318622958;

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** `OAuth k="v", k2="v2"` を { k: "v" } にする（値はエンコードされたまま）。 */
function parseAuthHeader(header: string): Record<string, string> {
  expect(header.startsWith("OAuth ")).toBe(true);
  return Object.fromEntries(
    header.slice("OAuth ".length).split(", ").map((pair) => {
      const match = pair.match(/^([^=]+)="([^"]*)"$/);
      expect(match).not.toBeNull();
      return [match![1], match![2]];
    })
  );
}

function sentAuthHeader(callIndex = 0): string {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

const hmac = (key: string, base: string) => createHmac("sha1", key).update(base).digest("base64");

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Date, "now").mockReturnValue(TIMESTAMP * 1000 + 999);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getXCredentials", () => {
  const env = {
    X_API_KEY: "key",
    X_API_SECRET: "secret",
    X_ACCESS_TOKEN: "token",
    X_ACCESS_TOKEN_SECRET: "token-secret",
  };

  it("4つそろえば資格情報を返す", () => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    expect(getXCredentials()).toEqual({
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "token",
      accessTokenSecret: "token-secret",
    });
  });

  it.each(Object.keys(env))("%s が欠けていれば null", (missing) => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, name === missing ? "" : value);
    expect(getXCredentials()).toBeNull();
  });
});

describe("OAuth 1.0a の署名", () => {
  it("署名ベース文字列を RFC 5849 の手順で組み立て、HMAC-SHA1 で署名する", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "1" } }));
    await postToX("本文", [], credentials);

    const params = parseAuthHeader(sentAuthHeader());
    expect(params).toMatchObject({
      oauth_consumer_key: credentials.apiKey,
      oauth_nonce: NONCE_HEX,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: String(TIMESTAMP),
      oauth_token: credentials.accessToken,
      oauth_version: "1.0",
    });
    // ヘッダーの項目は名前順に並ぶ
    expect(Object.keys(params)).toEqual([...Object.keys(params)].sort());

    // JSON 本文は署名に含めない。クエリもないので oauth_* だけを名前順に並べる。
    const expectedBase =
      "POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&" +
      "oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog" +
      `%26oauth_nonce%3D${NONCE_HEX}` +
      "%26oauth_signature_method%3DHMAC-SHA1" +
      `%26oauth_timestamp%3D${TIMESTAMP}` +
      "%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb" +
      "%26oauth_version%3D1.0";
    const expectedKey =
      "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE";
    expect(decodeURIComponent(params.oauth_signature)).toBe(hmac(expectedKey, expectedBase));
  });

  it("署名はヘッダー内で percent-encode される（base64 の + / = を残さない）", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "1" } }));
    await postToX("本文", [], credentials);
    const { oauth_signature } = parseAuthHeader(sentAuthHeader());
    expect(oauth_signature).not.toMatch(/[+/=]/);
    expect(oauth_signature).toMatch(/%3D$/);
  });

  it("RFC 3986 の予約文字（!*'() と空白）を % エンコードし、~ はそのまま残す", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "1" } }));
    const special = {
      apiKey: "a b!*'()~",
      apiSecret: "s&e=c",
      accessToken: "t/o+k",
      accessTokenSecret: "x!y",
    };
    await postToX("本文", [], special);

    const params = parseAuthHeader(sentAuthHeader());
    expect(params.oauth_consumer_key).toBe("a%20b%21%2A%27%28%29~");
    expect(params.oauth_token).toBe("t%2Fo%2Bk");

    // ベース文字列では、正規化した値をもう一度エンコードする（%XX → %25XX）。
    const expectedBase =
      "POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&" +
      "oauth_consumer_key%3Da%2520b%2521%252A%2527%2528%2529~" +
      `%26oauth_nonce%3D${NONCE_HEX}` +
      "%26oauth_signature_method%3DHMAC-SHA1" +
      `%26oauth_timestamp%3D${TIMESTAMP}` +
      "%26oauth_token%3Dt%252Fo%252Bk" +
      "%26oauth_version%3D1.0";
    // 署名鍵は「エンコードした API_SECRET & エンコードした ACCESS_TOKEN_SECRET」
    const expectedKey = "s%26e%3Dc&x%21y";
    expect(decodeURIComponent(params.oauth_signature)).toBe(hmac(expectedKey, expectedBase));
  });

  it("画像アップロードはアップロード用 URL で署名する", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "m1" } }));
    await uploadMedia(Buffer.from([1, 2, 3]), "image/png", credentials);

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.x.com/2/media/upload");
    const params = parseAuthHeader(sentAuthHeader());
    const expectedBase =
      "POST&https%3A%2F%2Fapi.x.com%2F2%2Fmedia%2Fupload&" +
      "oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog" +
      `%26oauth_nonce%3D${NONCE_HEX}` +
      "%26oauth_signature_method%3DHMAC-SHA1" +
      `%26oauth_timestamp%3D${TIMESTAMP}` +
      "%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb" +
      "%26oauth_version%3D1.0";
    const expectedKey =
      "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE";
    expect(decodeURIComponent(params.oauth_signature)).toBe(hmac(expectedKey, expectedBase));
  });
});

describe("postToX", () => {
  it("本文だけなら media を送らず、Post ID を返す", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "12345" } }));
    expect(await postToX("こんにちは", [], credentials)).toEqual({ success: true, status: 200, postId: "12345" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.x.com/2/tweets");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ text: "こんにちは" });
  });

  it("画像の media_id を添える", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "1" } }));
    await postToX("本文", ["m1", "m2"], credentials);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: "本文", media: { media_ids: ["m1", "m2"] } });
  });

  it("応答に Post ID がなくても成功として扱う", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    expect(await postToX("本文", [], credentials)).toEqual({ success: true, status: 200, postId: undefined });
  });

  it.each([401, 403])("%i は detail に認証情報・権限の確認を促す文を足して502にする", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Unauthorized" }, status));
    const result = await postToX("本文", [], credentials);
    expect(result.success).toBe(false);
    expect(result.status).toBe(502);
    expect(result.message).toBe(
      "X への投稿に失敗しました: Unauthorized（認証情報、またはアプリ権限が Read and Write か確認してください）"
    );
  });

  it.each([
    { body: { errors: [{ message: "a" }, {}, { message: "b" }] }, expected: "a / b" },
    { body: { title: "Too Many Requests" }, expected: "Too Many Requests" },
    { body: { unknown: true }, expected: "HTTP 429" },
  ])("エラー応答の内容をメッセージにする: $expected", async ({ body, expected }) => {
    fetchMock.mockResolvedValue(jsonResponse(body, 429));
    expect(await postToX("本文", [], credentials)).toEqual({
      success: false,
      status: 502,
      message: `X への投稿に失敗しました: ${expected}`,
    });
  });

  it("JSON でないエラー応答は HTTP ステータスだけを出す", async () => {
    fetchMock.mockResolvedValue(new Response("<html>error</html>", { status: 500 }));
    expect((await postToX("本文", [], credentials)).message).toBe("X への投稿に失敗しました: HTTP 500");
  });

  it("通信エラーは502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await postToX("本文", [], credentials)).toEqual({
      success: false,
      status: 502,
      message: "X への投稿中に通信エラーが発生しました",
    });
  });
});

describe("uploadMedia", () => {
  it("画像を multipart の media として送り、data.id を返す", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "m1" } }));
    expect(await uploadMedia(Buffer.from([1, 2, 3]), "image/png", credentials)).toEqual({ mediaId: "m1" });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    const media = body.get("media") as Blob;
    expect(media.type).toBe("image/png");
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("互換応答の media_id_string も受け付ける", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ media_id_string: "legacy" }));
    expect(await uploadMedia(Buffer.from([1]), "image/png", credentials)).toEqual({ mediaId: "legacy" });
  });

  it("media_id がなければエラー", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 123 } }));
    expect(await uploadMedia(Buffer.from([1]), "image/png", credentials)).toEqual({
      error: "画像アップロードの応答に media_id が含まれていません",
    });
  });

  it("エラー応答の内容をメッセージにする", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Media too large" }, 400));
    expect(await uploadMedia(Buffer.from([1]), "image/png", credentials)).toEqual({
      error: "画像アップロードに失敗しました: Media too large",
    });
  });

  it("通信エラーはエラーを返す（例外を投げない）", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await uploadMedia(Buffer.from([1]), "image/png", credentials)).toEqual({
      error: "画像アップロード中に通信エラーが発生しました",
    });
  });
});
