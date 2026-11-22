"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson, isAbortError, isRateLimitedError, RATE_LIMITED_MESSAGE } from "@/lib/api-client";

interface UseCrudResourceOptions {
  /** 書き込み先エンドポイント（POST/PUT/DELETE） */
  endpoint: string;
  /** 一覧取得URL（省略時は endpoint） */
  listUrl?: string;
  /** 一覧レスポンス内の配列キー（例: "products"） */
  listKey: string;
  /** リソース表示名（エラーメッセージ用。例: "商品"） */
  label: string;
  /** APIから1ページごとに取得する件数 */
  pageSize?: number;
}

interface PaginatedResourceResponse {
  [key: string]: unknown;
  total?: number;
}

/** 保存・削除の結果。失敗時は画面（開いているダイアログ）に出す文言を持つ。 */
export type ActionResult = { ok: true } | { ok: false; message: string };

const failureMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * 管理画面CRUDの共通フック。
 * ProductManagement / GalleryManagement / NewsManagement / InquiryManagement で
 * 重複していた fetch・保存・削除・再取得の定型を一元化する。
 *
 * - `loading` は初回の読み込み中だけ true（まだ表示する行がない）。
 * - `refreshing` は保存・削除・ページ送り後の再取得中。行は残したまま進行表示だけ出す。
 * - 保存・削除の失敗は `{ ok: false, message }` で返し、呼び出し側のダイアログ内に表示する。
 */
export function useCrudResource<T extends { id: number }, Payload extends object = Record<string, unknown>>({
  endpoint,
  listUrl,
  listKey,
  label,
  pageSize = 50,
}: UseCrudResourceOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const refreshNoticeRef = useRef<string | undefined>(undefined);
  const requestControllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async (successMessage = refreshNoticeRef.current) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setFetching(true);
    setError(null);

    try {
      const baseUrl = listUrl ?? endpoint;
      const separator = baseUrl.includes("?") ? "&" : "?";
      const data = await apiJson<PaginatedResourceResponse>(
        `${baseUrl}${separator}page=${page}&limit=${pageSize}`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;

      const list = data[listKey];
      const nextItems = Array.isArray(list) ? (list as T[]) : [];
      const nextTotal = typeof data.total === "number" ? data.total : nextItems.length;
      const lastPage = Math.max(1, Math.ceil(nextTotal / pageSize));

      refreshNoticeRef.current = undefined;
      setTotal(nextTotal);
      if (page > lastPage) {
        setPage(lastPage);
      } else {
        setItems(nextItems);
      }
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) {
        console.error(`${label}一覧の取得に失敗:`, error);
        const prefix = successMessage ? `${successMessage}。` : "";
        // レート制限（429）は理由が分かるよう専用の案内にする（#338）
        setError(isRateLimitedError(error)
          ? `${prefix}${label}一覧を取得できませんでした。${RATE_LIMITED_MESSAGE}`
          : `${prefix}${label}一覧の取得に失敗しました。再試行してください。`);
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setFetching(false);
        setLoaded(true);
      }
    }
  }, [endpoint, listUrl, listKey, label, page, pageSize]);

  useEffect(() => {
    void refetch();
    return () => requestControllerRef.current?.abort();
  }, [refetch]);

  /** 保存（id 指定で更新・省略で作成）。 */
  const save = useCallback(
    async (payload: Payload, id?: number): Promise<ActionResult> => {
      try {
        await apiJson(endpoint, {
          method: id ? "PUT" : "POST",
          body: id ? { id, ...payload } : payload,
        });
      } catch (error) {
        console.error(`${label}の保存に失敗:`, error);
        return { ok: false, message: failureMessage(error, `${label}の保存に失敗しました`) };
      }
      // 保存は成功している。一覧の更新に失敗しても再送信は促さず、一覧側のエラーに成功を添える。
      refreshNoticeRef.current = `${label}を保存しました`;
      if (!id && page !== 1) {
        setPage(1);
      } else {
        await refetch();
      }
      return { ok: true };
    },
    [endpoint, label, page, refetch]
  );

  /** 削除。 */
  const remove = useCallback(
    async (id: number): Promise<ActionResult> => {
      try {
        await apiJson(endpoint, { method: "DELETE", body: { id } });
      } catch (error) {
        console.error(`${label}の削除に失敗:`, error);
        return { ok: false, message: failureMessage(error, `${label}の削除に失敗しました`) };
      }
      refreshNoticeRef.current = `${label}を削除しました`;
      await refetch();
      return { ok: true };
    },
    [endpoint, label, refetch]
  );

  return {
    items,
    /** 初回の読み込み中（表示する行がまだない） */
    loading: fetching && !loaded,
    /** 再取得中（行は残して進行表示だけ出す） */
    refreshing: fetching && loaded,
    error,
    retry: refetch,
    save,
    remove,
    pagination: {
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      setPage,
      /** ResourceTable の pagination にそのまま渡せるよう同じ関数を別名でも返す */
      onPageChange: setPage,
    },
  };
}
