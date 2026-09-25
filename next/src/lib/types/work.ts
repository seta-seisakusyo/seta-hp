import type { Work as PrismaWork } from "@prisma/client";

// DB直取得（Date）とAPIレスポンス（ISO文字列）の両方を受けつつ、
// モデルのフィールド追加・変更はPrisma型へ追従する。
export type Work = Omit<PrismaWork, "createdAt">;

/** 管理画面の一覧・編集で使う。productIds は使用商品の紐づけ（includeUnpublished 時のみ返る） */
export type ManagedWork = Work & { productIds?: number[] };

/** 作品に使った商品へのリンク */
export interface WorkProductLink {
  id: number;
  name: string;
}

/** 商品詳細の「この商品を使った展示例」で使うサブセット */
export type WorkSummary = Pick<Work, "id" | "title" | "category" | "image">;

/** ギャラリー一覧カードで使うサブセット。products は公開中の使用商品のみ */
export type WorkGridItem = WorkSummary & { products: WorkProductLink[] };
