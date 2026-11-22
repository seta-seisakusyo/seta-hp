import { useCallback, useEffect, useState } from "react";
import type { WorkGridItem } from "@/lib/types/work";
import { canOpenWork, findWorkById, hasWorkParam, workCardId } from "./work-gallery";

/**
 * 作品の拡大表示の開閉と ?work={id} との同期。
 * 開くときは履歴を追加しない（戻るボタンはギャラリーの前のページへ戻る）。
 */
export function useWorkLightbox(works: WorkGridItem[], initialWorkId: number | null) {
  const initialWork = findWorkById(works, initialWorkId);
  const [selectedWork, setSelectedWork] = useState<WorkGridItem | null>(null);

  // 指定作品はマウント後に拡大表示を開く。初回描画から開いた状態にすると、
  // Dialog のスタイル適用前にフォーカス移動が走り、背面ページがスクロールしてしまう。
  // 画像がなく拡大表示を開けない作品は、カードまでスクロールして位置を示す。
  useEffect(() => {
    if (!initialWork) return;
    if (canOpenWork(initialWork)) {
      setSelectedWork(initialWork);
    } else {
      document.getElementById(workCardId(initialWork.id))?.scrollIntoView({ block: "center" });
    }
  }, [initialWork]);

  const openWork = useCallback((work: WorkGridItem) => {
    if (canOpenWork(work)) setSelectedWork(work);
  }, []);

  const closeWork = useCallback(() => {
    setSelectedWork(null);
    // 閉じた後の再読み込みで開き直さないよう ?work= を取り除く
    if (hasWorkParam(window.location.search)) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  return { selectedWork, openWork, closeWork };
}
