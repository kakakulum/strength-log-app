// 저장된 세트 기록을 화면에서 읽는 훅. 서버 렌더링 중에는 null(아직 모름)을 돌려준다.
import { useMemo, useSyncExternalStore } from "react";
import { loadSets } from "./storage";
import type { SetRecord } from "./types";

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

export function useSets(): SetRecord[] | null {
  const raw = useSyncExternalStore(subscribe, getRaw, () => null);
  return useMemo(() => {
    if (raw === null) return null;
    const loaded = loadSets();
    return loaded.ok ? loaded.value : [];
  }, [raw]);
}
