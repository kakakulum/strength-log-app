// 월간 추세 정답 테스트: 1년 전까지 날짜가 흩어진 기록으로 월별 집계를 검증한다.
import { describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getMonthlyCounts, kstMonthKey } from "./trend";

// 기준 시각: 2026-11-15(일) KST → 이번 달 2026-11
const NOW = new Date("2026-11-15T12:00:00+09:00");

let counter = 0;
function set(completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord {
  counter += 1;
  return { workoutId: `w${counter}`, setNo: 1, exerciseId, reps: 10, completedAt };
}
function sets(n: number, completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord[] {
  return Array.from({ length: n }, () => set(completedAt, exerciseId));
}

// 정답을 미리 정해 둔 흩어진 기록 (스쿼트)
const DATA: SetRecord[] = [
  ...sets(4, "2026-11-03T10:00:00+09:00"), // 2026-11: 4
  ...sets(2, "2026-10-31T23:59:59+09:00"), // 2026-10: 2 (달의 마지막 순간)
  ...sets(5, "2026-09-10T10:00:00+09:00"), // 2026-09: 5
  ...sets(3, "2026-07-20T10:00:00+09:00"), // 2026-07: 3
  ...sets(6, "2026-05-02T10:00:00+09:00"), // 2026-05: 6
  ...sets(1, "2025-12-25T10:00:00+09:00"), // 2025-12: 1
  ...sets(7, "2025-11-30T10:00:00+09:00"), // 12개월 범위 밖(2025-11): 세지 않음
  ...sets(9, "2026-11-03T10:00:00+09:00", "bench-press"), // 다른 종목: 세지 않음
];

const toMap = (r: { month: string; count: number }[]) =>
  Object.fromEntries(r.map((m) => [m.month, m.count]));

describe("kstMonthKey — KST 기준 달", () => {
  it("달의 마지막 순간은 그 달, 다음 날 00:00은 다음 달", () => {
    expect(kstMonthKey("2026-10-31T23:59:59+09:00")).toBe("2026-10");
    expect(kstMonthKey("2026-11-01T00:00:00+09:00")).toBe("2026-11");
  });
  it("UTC로 표기해도 KST 기준 (UTC 10-31 15:00 = KST 11-01 00:00)", () => {
    expect(kstMonthKey("2026-10-31T15:00:00Z")).toBe("2026-11");
    expect(kstMonthKey("2026-10-31T14:59:59Z")).toBe("2026-10");
  });
});

describe("getMonthlyCounts — 기간별 월별 세트 수", () => {
  it("1개월 = 이번 달만", () => {
    expect(getMonthlyCounts(DATA, "squat", 1, NOW)).toEqual([{ month: "2026-11", count: 4 }]);
  });

  it("3개월 = 이번 달과 앞의 2개월, 최신 달부터", () => {
    expect(getMonthlyCounts(DATA, "squat", 3, NOW)).toEqual([
      { month: "2026-11", count: 4 },
      { month: "2026-10", count: 2 },
      { month: "2026-09", count: 5 },
    ]);
  });

  it("6개월 — 기록이 없는 달은 0으로 포함", () => {
    const r = getMonthlyCounts(DATA, "squat", 6, NOW);
    expect(r.map((m) => m.month)).toEqual([
      "2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06",
    ]);
    expect(toMap(r)).toEqual({
      "2026-11": 4, "2026-10": 2, "2026-09": 5, "2026-08": 0, "2026-07": 3, "2026-06": 0,
    });
  });

  it("1년 = 12개월, 연도를 넘어도 맞고 범위 밖 기록은 세지 않는다", () => {
    const r = getMonthlyCounts(DATA, "squat", 12, NOW);
    expect(r).toHaveLength(12);
    expect(r[0].month).toBe("2026-11");
    expect(r[11].month).toBe("2025-12");
    expect(toMap(r)["2025-12"]).toBe(1);
    expect(toMap(r)["2026-05"]).toBe(6);
    expect(r.reduce((sum, m) => sum + m.count, 0)).toBe(4 + 2 + 5 + 3 + 6 + 1); // 21
  });

  it("선택한 종목만 센다", () => {
    expect(getMonthlyCounts(DATA, "bench-press", 1, NOW)).toEqual([{ month: "2026-11", count: 9 }]);
    expect(getMonthlyCounts(DATA, "leg-press", 3, NOW).every((m) => m.count === 0)).toBe(true);
  });

  it("기준 시각이 1월이어도 전년도 12월로 넘어간다", () => {
    const jan = new Date("2026-01-10T12:00:00+09:00");
    expect(getMonthlyCounts([], "squat", 3, jan).map((m) => m.month)).toEqual([
      "2026-01", "2025-12", "2025-11",
    ]);
  });

  it("기록이 하나도 없어도 기간만큼 0으로 채운다", () => {
    const r = getMonthlyCounts([], "squat", 6, NOW);
    expect(r).toHaveLength(6);
    expect(r.every((m) => m.count === 0)).toBe(true);
  });
});
