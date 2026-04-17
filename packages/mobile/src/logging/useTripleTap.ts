import { useCallback, useRef } from "react";

const WINDOW_MS = 650;

export function useTripleTap(onTriple: () => void): () => void {
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(() => {
    countRef.current += 1;
    if (timerRef.current != null) clearTimeout(timerRef.current);
    if (countRef.current >= 3) {
      countRef.current = 0;
      onTriple();
      return;
    }
    timerRef.current = setTimeout(() => {
      countRef.current = 0;
      timerRef.current = null;
    }, WINDOW_MS);
  }, [onTriple]);
}
