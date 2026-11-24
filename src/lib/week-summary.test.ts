// 홈의 이번 주 요약 테스트: 세트 수·운동한 날 수와 주·날짜 경계(KST)
import { describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getWeekSummary } from "./week";

function rec(workoutId: string, setNo: number, completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord {
  return { workoutId, setNo, exerciseId, reps: 10, completedAt };
}

// 2026-11-25(수) 낮. 이번 주는 11-23(월) 00:00 ~ 11-29(일) 24:00
const NOW = new Date("2026-11-25T12:00:00+09:00");

describe("이번 주 요약", () => {
  it("기록이 없으면 0세트·0일이다", () => {
    expect(getWeekSummary([], NOW)).toEqual({ sets: 0, days: 0 });
  });

  it("모든 종목의 세트를 합하고, 같은 날은 하루로 센다", () => {
    const sets = [
      rec("a", 1, "2026-11-23T10:00:00+09:00"),
      rec("a", 2, "2026-11-23T10:05:00+09:00", "squat"),
      rec("b", 1, "2026-11-23T20:00:00+09:00", "bench-press"),
      rec("c", 1, "2026-11-25T09:00:00+09:00", "deadlift"),
    ];
    expect(getWeekSummary(sets, NOW)).toEqual({ sets: 4, days: 2 });
  });

  it("지난주와 다음 주 기록은 세지 않는다 (월요일 00:00 경계)", () => {
    const sets = [
      rec("a", 1, "2026-11-22T23:59:59+09:00"), // 지난주 일요일 마지막 순간
      rec("b", 1, "2026-11-23T00:00:00+09:00"), // 이번 주 월요일 첫 순간
      rec("c", 1, "2026-11-30T00:00:00+09:00"), // 다음 주
    ];
    expect(getWeekSummary(sets, NOW)).toEqual({ sets: 1, days: 1 });
  });

  it("한국 시간 날짜로 센다 (UTC로는 전날인 새벽 기록도 그날로 본다)", () => {
    const sets = [rec("a", 1, "2026-11-24T00:30:00+09:00"), rec("b", 1, "2026-11-24T23:30:00+09:00")];
    expect(getWeekSummary(sets, NOW)).toEqual({ sets: 2, days: 1 });
  });
});
