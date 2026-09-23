import { useState } from "react";
import { usePendingAction } from "./usePendingAction";

/** CRUD管理画面で共通する削除対象・確認ダイアログ・削除確定処理。 */
export function useResourceDelete(remove: (id: number) => Promise<boolean>) {
  const { isPending, isRunning, run } = usePendingAction();
  const [targetId, setTargetId] = useState<number | null>(null);

  const requestDelete = (id: number) => { if (!isRunning()) setTargetId(id); };
  const cancelDelete = () => { if (!isRunning()) setTargetId(null); };
  const confirmDelete = () => run(async () => {
    if (targetId === null) return false;
    const ok = await remove(targetId);
    if (ok) setTargetId(null);
    return ok;
  });

  return {
    isDeleting: isPending,
    deleteDialogOpen: targetId !== null,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
