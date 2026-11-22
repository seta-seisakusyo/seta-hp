import { describe, it, expect } from "vitest";
import { buildPageMetadata } from "@/lib/metadata";
import { DEFAULT_OG_IMAGE, SITE_DEFAULT_TITLE, SITE_DESCRIPTION } from "@/lib/site-config";

type Og = { url?: string; title?: string; description?: string; images?: unknown };
type Tw = { title?: string; description?: string; images?: unknown };

describe("buildPageMetadata", () => {
  const meta = buildPageMetadata({
    title: "ギャラリー",
    description: "ギャラリーの説明",
    path: "/gallery",
  });

  it("canonical をそのページのパスにする", () => {
    expect(meta.alternates).toEqual({ canonical: "/gallery" });
    expect(meta).not.toHaveProperty("robots");
  });

  it("og:url をそのページの絶対URLにする", () => {
    expect((meta.openGraph as Og).url).toBe("https://kaza-love.com/gallery");
  });

  it("題名は template 任せにし、OG・X には「題名 | 飾Love」を入れる", () => {
    expect(meta.title).toBe("ギャラリー");
    expect((meta.openGraph as Og).title).toBe("ギャラリー | 飾Love");
    expect((meta.twitter as Tw).title).toBe("ギャラリー | 飾Love");
  });

  it("説明文を meta・OG・X に入れる", () => {
    expect(meta.description).toBe("ギャラリーの説明");
    expect((meta.openGraph as Og).description).toBe("ギャラリーの説明");
    expect((meta.twitter as Tw).description).toBe("ギャラリーの説明");
  });

  it("画像の指定がなければ既定の OG 画像を使う", () => {
    expect((meta.openGraph as Og).images).toEqual([
      expect.objectContaining({ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }),
    ]);
    expect((meta.twitter as Tw).images).toEqual([DEFAULT_OG_IMAGE]);
  });

  it("画像を指定するとその画像に置き換える", () => {
    const withImage = buildPageMetadata({
      title: "商品",
      description: "説明",
      path: "/products/7",
      image: "/uploads/a.png",
    });
    expect((withImage.openGraph as Og).images).toEqual(["/uploads/a.png"]);
    expect((withImage.twitter as Tw).images).toEqual(["/uploads/a.png"]);
  });

  it("absolute の題名は template を付けずにそのまま使う", () => {
    const home = buildPageMetadata({
      title: { absolute: SITE_DEFAULT_TITLE },
      description: SITE_DESCRIPTION,
      path: "/",
    });
    expect(home.title).toEqual({ absolute: SITE_DEFAULT_TITLE });
    expect((home.openGraph as Og).title).toBe(SITE_DEFAULT_TITLE);
    expect((home.openGraph as Og).url).toBe("https://kaza-love.com/");
    expect(home.alternates).toEqual({ canonical: "/" });
  });

  it("noindex では robots を index:false にし、canonical を出さない", () => {
    const login = buildPageMetadata({ title: "ログイン", path: "/login", noindex: true });
    expect(login.robots).toEqual({ index: false, follow: false });
    expect(login).not.toHaveProperty("alternates");
    expect(login).not.toHaveProperty("description");
    // OG はトップの値を引き継がず、そのページの URL を出す
    expect((login.openGraph as Og).url).toBe("https://kaza-love.com/login");
    expect((login.openGraph as Og).description).toBe(SITE_DESCRIPTION);
  });
});
