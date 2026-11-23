// 저장된 세트 기록을 화면에서 읽는 훅.
import { useMemo, useSyncExternalStore } from "react";
import { loadSets } from "./storage";
import type { SetRecord } from "./types";

/** 읽는 중(서버 렌더링 단계) / 읽기 실패 / 읽기 성공 */
export type SetsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; sets: SetRecord[] };

const subscribe = (onChange: () => void) => {
  // 다른 탭에서 기록이 바뀌면 다시 읽는다.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

// 원문 문자열을 스냅샷으로 써서 값이 같으면 다시 계산하지 않게 한다.
function getRaw(): string {
  try {
    return window.localStorage.getItem("sets") ?? "";
  } catch {
    return "";
  }
}

export function useSets(): SetsState {
  const raw = useSyncExternalStore(subscribe, getRaw, () => null);
  return useMemo<SetsState>(() => {
    if (raw === null) return { status: "loading" };
    // 읽기에 실패한 것을 "기록 없음"으로 보이게 하면 기록이 사라진 것처럼 오해하므로 구분한다.
    const loaded = loadSets();
    return loaded.ok
      ? { status: "ok", sets: loaded.value }
      : { status: "error", message: loaded.error };
  }, [raw]);
}
