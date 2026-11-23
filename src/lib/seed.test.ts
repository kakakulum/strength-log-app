// 가상 기록 검증: 시드 데이터의 정답표와 주간·추세 함수의 결과가 모두 일치하는지 확인한다.
import { describe, expect, it } from "vitest";
import { EXERCISES, type ExerciseId } from "./exercises";
import { createSeedData, lastTwelveMonths } from "./seed";
import { RANGES, getMonthlyCounts, getMonthlyReps } from "./trend";
import { getWeeklyStatus } from "./week";

// 기준 시각을 여러 경계 상황으로 바꿔 가며 같은 정답이 나오는지 본다.
const NOWS: Record<string, Date> = {
  "수요일 낮": new Date("2026-11-25T12:00:00+09:00"),
  "월요일 00:00:00 (새 주 시작)": new Date("2026-11-23T00:00:00+09:00"),
  "일요일 23:59:59 (주 마지막)": new Date("2026-11-29T23:59:59+09:00"),
  "월 첫날 (12-01)": new Date("2026-12-01T09:00:00+09:00"),
  "1월 초 (연도 넘김)": new Date("2027-01-02T09:00:00+09:00"),
  "3월 초 (2월 경계)": new Date("2026-03-01T00:00:00+09:00"),
};

describe.each(Object.entries(NOWS))("가상 기록 — 기준 %s", (_label, now) => {
  const seed = createSeedData(now);

  it("주간 집계가 종목별 정답과 일치한다", () => {
    for (const { id } of EXERCISES) {
      const r = getWeeklyStatus(seed.records, id, now);
      const want = seed.weekly[id];
      expect(r.thisWeekCount, `${id} 이번 주`).toBe(want.thisWeekCount);
      expect(r.lastWeekLabel, `${id} 지난주`).toBe(want.lastWeekLabel);
      expect(r.changeLabel, `${id} 변화`).toBe(want.changeLabel);
    }
  });

  it("1개월·3개월·6개월·1년 월별 집계가 정답표와 일치한다", () => {
    const months = lastTwelveMonths(now);
    for (const { id } of EXERCISES) {
      for (const { months: n } of RANGES) {
        const got = getMonthlyCounts(seed.records, id as ExerciseId, n, now);
        const want = months.slice(0, n).map((month) => ({ month, count: seed.monthly[id][month] }));
        expect(got, `${id} ${n}개월`).toEqual(want);
      }
    }
  });

  it("화면의 월별 총 반복 횟수가 정답표와 일치한다 (1개월·3개월·6개월·1년)", () => {
    const months = lastTwelveMonths(now);
    for (const { id } of EXERCISES) {
      for (const { months: n } of RANGES) {
        const got = getMonthlyReps(seed.records, id as ExerciseId, n, now);
        const want = months.slice(0, n).map((month) => ({ month, reps: seed.monthlyReps[id][month] }));
        expect(got, `${id} ${n}개월`).toEqual(want);
      }
    }
  });

  it("12개월 밖 기록(스쿼트 7세트)은 1년 범위에 들어가지 않는다", () => {
    const total = getMonthlyCounts(seed.records, "squat", 12, now).reduce((s, m) => s + m.count, 0);
    const all = seed.records.filter((r) => r.exerciseId === "squat").length;
    expect(all - total).toBe(7);
  });
});

describe("가상 기록의 형식", () => {
  const seed = createSeedData(new Date("2026-11-25T12:00:00+09:00"));

  it("횟수는 1~100 정수이고 (운동 ID + 세트 번호)가 겹치지 않는다", () => {
    const keys = new Set<string>();
    for (const r of seed.records) {
      expect(Number.isInteger(r.reps) && r.reps >= 1 && r.reps <= 100).toBe(true);
      const key = `${r.workoutId}#${r.setNo}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  });

  it("시각은 +09:00 오프셋 문자열이다", () => {
    expect(seed.records.every((r) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(r.completedAt))).toBe(true);
  });

  it("PRD 예시: 스쿼트 이번 주 7세트·지난주 5세트 → +2세트", () => {
    expect(seed.weekly.squat).toEqual({ thisWeekCount: 7, lastWeekLabel: "5세트", changeLabel: "+2세트" });
  });
});
