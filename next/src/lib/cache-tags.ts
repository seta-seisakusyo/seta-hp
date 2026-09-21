import { revalidatePath, revalidateTag } from "next/cache";

/**
 * unstable_cache のタグ定義。
 * 公開ページのDBアクセスはこのタグ付きでキャッシュし、
 * 管理画面からの書き込み時に revalidate* で即時無効化する。
 */
// 公開ページの表示が実データから遅れうる最大時間。
// 管理画面からの保存では revalidate* で即時破棄されるが、それ以外の経路でDBが変わった場合
// （直接のSQL操作・リストアなど）はこの時間だけ古い内容を配信し続ける。
// 非公開にした商品が最大1時間カタログに残る状態を避けるため、1時間から短縮した。
// 商品・制作事例は数十件規模でクエリも軽く、毎分のDBアクセスは問題にならない。
export const CACHE_REVALIDATE_SECONDS = 60;

export const CACHE_TAGS = {
  products: "products",
  works: "works",
} as const;

/**
 * 商品の作成・更新・削除後に、商品を表示する全ページのキャッシュを破棄する。
 * - products タグ: トップ（カタログ/ヒーロー画像）・商品一覧のデータキャッシュ
 * - /products/[id]: ISR済みの商品詳細ページ（関連商品の表示を含むため全件）
 */
export function revalidateProductPages() {
  revalidateTag(CACHE_TAGS.products);
  revalidatePath("/products/[id]", "page");
}

/** 制作事例の作成・更新・削除後に、ギャラリーのデータキャッシュを破棄する。 */
export function revalidateWorkPages() {
  revalidateTag(CACHE_TAGS.works);
}
