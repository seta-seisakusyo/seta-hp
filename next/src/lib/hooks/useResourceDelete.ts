import { useState } from "react";
import type { ActionResult } from "./useCrudResource";
import { usePendingAction } from "./usePendingAction";

/**
 * CRUD管理画面で共通する削除対象・確認ダイアログ・削除確定処理。
 * 削除に失敗したらダイアログを開いたまま `error` に理由を入れる（DeleteConfirmDialog が表示する）。
 */
export function useResourceDelete<T extends { id: number }>(remove: (id: number) => Promise<ActionResult>) {
  const { isPending, isRunning, run } = usePendingAction();
  const [target, setTarget] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestDelete = (item: T) => {
    if (isRunning()) return;
    setError(null);
    setTarget(item);
  };
  const cancelDelete = () => {
    if (isRunning()) return;
    setError(null);
    setTarget(null);
  };
  const confirmDelete = () => run(async () => {
    if (target === null) return false;
    setError(null);
    const result = await remove(target.id);
    if (result.ok) {
      setTarget(null);
    } else {
      setError(result.message);
    }
    return result.ok;
  });

  return {
    /** 削除確認中の対象（確認文に名前を出すため） */
    target,
    isDeleting: isPending,
    deleteDialogOpen: target !== null,
    error,
    requestDelete,
    cancelDelete,
    confirmDelete,
    /** DeleteConfirmDialog へそのまま渡す状態と操作 */
    dialogProps: {
      open: target !== null,
      submitting: isPending,
      error,
      onClose: cancelDelete,
      onConfirm: confirmDelete,
    },
  };
}
