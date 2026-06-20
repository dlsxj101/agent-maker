"use client";

import { useSyncExternalStore } from "react";

/**
 * 클라이언트 마운트(하이드레이션) 여부 — 서버=false, 클라이언트=true.
 * Zustand persist 가 localStorage 를 복원하기 전(SSR)과 후의 불일치를 피한다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
