// Design Ref: §1 세트 진행 — 휴식 타이머 규칙(+30초 연장, 알림 시점). 화면과 분리해 테스트할 수 있게 한다.
import { toKstTimestamp } from "./storage";
import type { KstTimestamp } from "./types";

/** [+30초]로 늘어나는 시간(초) */
export const EXTEND_SEC = 30;

/** 종료 시각까지 남은 초 (올림, 0 미만은 0) */
export function restRemainingSec(restEndsAt: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(restEndsAt).getTime() - nowMs) / 1000));
}

/**
 * 현재 종료 시각을 30초 뒤로 미룬 새 종료 시각을 돌려준다.
 * 이미 끝난 휴식(남은 시간 0)이면 연장하지 않고 null을 돌려준다.
 */
export function extendRestEnd(restEndsAt: string, nowMs: number): KstTimestamp | null {
  const end = new Date(restEndsAt).getTime();
  if (Number.isNaN(end) || end <= nowMs) return null;
  return toKstTimestamp(new Date(end + EXTEND_SEC * 1000));
}

/**
 * 소리·진동을 낼 때인지 판단한다: 남은 시간이 0보다 크다가 0이 되는 "끝나는 순간"에만 true.
 * 이미 끝나 있는 휴식을 다시 그리거나 같은 값으로 다시 렌더링해도 true가 되지 않는다.
 */
export function shouldAlertRestEnd(prevRemainingSec: number, remainingSec: number): boolean {
  return prevRemainingSec > 0 && remainingSec === 0;
}
