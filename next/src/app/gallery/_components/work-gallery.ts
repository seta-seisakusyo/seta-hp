import type { WorkGridItem } from "@/lib/types/work";

/** 作品カードの要素ID。拡大表示を開けない作品へスクロールするときに使う */
export const workCardId = (id: number) => `work-${id}`;

// 作品画像の枠の縦横比。サムネイルと拡大表示で揃える。
// スマホは正方形にして横長写真の上下の余白を減らし、それ以上は縦長（4:5）。
export const WORK_IMAGE_ASPECT = { xs: "1 / 1", sm: "4 / 5" } as const;

/**
 * /gallery?work={id} で指定された作品。見つからなければ null。
 * 一覧の要素をそのまま返す（参照が変わらないので effect の依存に使える）。
 */
export function findWorkById(works: WorkGridItem[], id: number | null): WorkGridItem | null {
  if (id === null) return null;
  return works.find((work) => work.id === id) ?? null;
}

/** 拡大表示を開ける作品か（画像がない作品は開けない） */
export function canOpenWork(work: Pick<WorkGridItem, "image">): boolean {
  return Boolean(work.image);
}

/** URL のクエリ文字列（location.search）に ?work= が含まれるか */
export function hasWorkParam(search: string): boolean {
  return new URLSearchParams(search).has("work");
}
