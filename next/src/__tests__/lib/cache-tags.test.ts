import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => mocks);

import { CACHE_TAGS, revalidateProductPages, revalidateWorkPages } from "@/lib/cache-tags";

beforeEach(() => vi.clearAllMocks());

// 商品と作品は相互リンクしているため、どちらの更新でも相手側の表示を破棄する。
describe("相互リンクのキャッシュ破棄", () => {
  it("商品の更新でギャラリー（works）も破棄する", () => {
    revalidateProductPages();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.products);
    expect(mocks.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.works);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/products/[id]", "page");
  });

  it("作品の更新で商品詳細ページも破棄する", () => {
    revalidateWorkPages();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.works);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/products/[id]", "page");
  });
});
