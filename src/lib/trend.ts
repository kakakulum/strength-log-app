// Design Ref: §2-C 추세 조회 — 기간은 달력 기준 월(이번 달 포함), 선택한 종목만 월별로 합산한다.
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 조회 기간 선택지. 최대 범위는 최근 1년(12개월)이다. */
export const RANGES = [
  { months: 1, label: "1개월" },
  { months: 3, label: "3개월" },
  { months: 6, label: "6개월" },
  { months: 12, label: "1년" },
] as const;

export type RangeMonths = (typeof RANGES)[number]["months"];

/** 시각이 속한 한국 시간(KST) 달을 "YYYY-MM"으로 돌려준다. */
export function kstMonthKey(time: string | Date): string {
  return new Date(new Date(time).getTime() + KST_OFFSET_MS).toISOString().slice(0, 7);
}

export interface MonthlyCount {
  /** "YYYY-MM" */
  month: string;
  /** 그 달 완료 세트 수 (기록이 없는 달은 0) */
  count: number;
}

/**
 * 기간 안의 월별 세트 수를 최신 달부터 돌려준다.
 * - 기간은 달력 기준이다. 이번 달을 포함해 1개월 = 이번 달, 3개월 = 이번 달과 앞의 2개월, 1년 = 12개월.
 * - 선택한 종목의 완료 세트만 센다. 기록이 없는 달도 0으로 포함한다.
 * @param now 기준 시각 (테스트에서 고정할 수 있도록 인자로 받는다)
 */
export function getMonthlyCounts(
  sets: SetRecord[],
  exerciseId: ExerciseId,
  rangeMonths: RangeMonths,
  now: Date = new Date(),
): MonthlyCount[] {
  const [year, month] = kstMonthKey(now).split("-").map(Number);

  const result: MonthlyCount[] = [];
  for (let i = 0; i < rangeMonths; i++) {
    // month는 1~12. (month - 1 - i)를 Date.UTC에 넘기면 연도 넘김을 알아서 처리한다.
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    result.push({ month: d.toISOString().slice(0, 7), count: 0 });
  }

  const byMonth = new Map(result.map((m) => [m.month, m]));
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    const entry = byMonth.get(kstMonthKey(s.completedAt));
    if (entry) entry.count += 1;
  }
  return result;
}
