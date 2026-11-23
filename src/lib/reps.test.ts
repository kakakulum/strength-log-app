// 월별 총 반복 횟수 정답 테스트: 세트별 횟수를 KST 달력 월로 합산한다.
import { describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getMonthDetail, getMonthlyReps } from "./trend";

// 기준 시각: 2026-11-15(일) KST → 이번 달 2026-11
const NOW = new Date("2026-11-15T12:00:00+09:00");

let counter = 0;
/** 한 번의 운동(workoutId 하나)을 세트별 횟수로 만든다 */
function workout(
  completedAt: string,
  reps: number[],
  exerciseId: ExerciseId = "squat",
): SetRecord[] {
  counter += 1;
  return reps.map((r, i) => ({
    workoutId: `w${counter}`,
    setNo: i + 1,
    exerciseId,
    reps: r,
    completedAt,
  }));
}

const toMap = (r: { month: string; reps: number }[]) =>
  Object.fromEntries(r.map((m) => [m.month, m.reps]));

describe("getMonthlyReps — 월별 총 반복 횟수", () => {
  it("8·8·8·8은 32회", () => {
    const data = workout("2026-11-03T10:00:00+09:00", [8, 8, 8, 8]);
    expect(getMonthlyReps(data, "squat", 1, NOW)).toEqual([{ month: "2026-11", reps: 32 }]);
  });

  it("10·10·10·10은 40회", () => {
    const data = workout("2026-11-03T10:00:00+09:00", [10, 10, 10, 10]);
    expect(getMonthlyReps(data, "squat", 1, NOW)).toEqual([{ month: "2026-11", reps: 40 }]);
  });

  it("10·9·7·6은 32회", () => {
    const data = workout("2026-11-03T10:00:00+09:00", [10, 9, 7, 6]);
    expect(getMonthlyReps(data, "squat", 1, NOW)).toEqual([{ month: "2026-11", reps: 32 }]);
  });

  it("같은 달에 여러 번 운동하면 전부 합산한다 (32 + 40 + 32 = 104)", () => {
    const data = [
      ...workout("2026-11-03T10:00:00+09:00", [8, 8, 8, 8]),
      ...workout("2026-11-08T10:00:00+09:00", [10, 10, 10, 10]),
      ...workout("2026-11-14T10:00:00+09:00", [10, 9, 7, 6]),
    ];
    expect(toMap(getMonthlyReps(data, "squat", 1, NOW))["2026-11"]).toBe(104);
  });

  it("기록이 없는 달은 0이고, 기간·달 경계(KST)와 종목 구분을 지킨다", () => {
    const data = [
      ...workout("2026-11-03T10:00:00+09:00", [8, 8, 8, 8]), // 11월 32
      ...workout("2026-10-31T23:59:59+09:00", [10, 10]), // 10월 20 (달의 마지막 순간)
      ...workout("2026-08-10T10:00:00+09:00", [5, 5, 5]), // 8월 15
      ...workout("2025-11-30T10:00:00+09:00", [99]), // 12개월 밖: 세지 않음
      ...workout("2026-11-03T10:00:00+09:00", [50], "bench-press"), // 다른 종목: 세지 않음
    ];
    const r = getMonthlyReps(data, "squat", 12, NOW);
    expect(r).toHaveLength(12);
    expect(toMap(r)).toMatchObject({
      "2026-11": 32,
      "2026-10": 20,
      "2026-09": 0,
      "2026-08": 15,
      "2026-07": 0,
    });
    expect(r.reduce((sum, m) => sum + m.reps, 0)).toBe(32 + 20 + 15);
    // 최신 달부터 정렬
    expect(r[0].month).toBe("2026-11");
    // 막대 값과 상세의 총 횟수가 같다
    const detail = getMonthDetail(data, "squat", "2026-11");
    expect(detail.flatMap((w) => w.reps).reduce((a, b) => a + b, 0)).toBe(32);
  });

  it("기록이 하나도 없으면 전부 0", () => {
    expect(getMonthlyReps([], "squat", 6, NOW).every((m) => m.reps === 0)).toBe(true);
  });
});
