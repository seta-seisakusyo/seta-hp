"use client";

import { useCallback, useRef, useState } from "react";

/** 同じイベントループ内の連打も防ぎ、画面の操作可否と処理中状態を揃える。 */
export function usePendingAction() {
  const pendingRef = useRef(false);
  const [isPending, setPending] = useState(false);
  const isRunning = useCallback(() => pendingRef.current, []);
  const run = useCallback(async (action: () => Promise<boolean>): Promise<boolean> => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    try {
      return await action();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);
  return { isPending, isRunning, run };
}
