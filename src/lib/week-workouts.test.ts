// 홈의 이번 주 요약 테스트: 종목별·운동별 세트별 횟수와 주(KST) 경계
import { describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getWeekWorkouts } from "./week";

function rec(workoutId: string, setNo: number, reps: number, completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord {
  return { workoutId, setNo, exerciseId, reps, completedAt };
}

// 2026-11-25(수) 낮. 이번 주는 11-23(월) 00:00 ~ 11-29(일) 24:00
const NOW = new Date("2026-11-25T12:00:00+09:00");

describe("이번 주 요약 (종목별 세트별 횟수)", () => {
  it("기록이 없으면 빈 목록이다", () => {
    expect(getWeekWorkouts([], NOW)).toEqual([]);
  });

  it("푸시업 3·3·3·3, 스쿼트 10·10 처럼 종목마다 세트별 횟수를 돌려준다 (고정 종목 순서)", () => {
    const sets = [
      rec("p", 1, 3, "2026-11-24T09:00:00+09:00", "push-up"),
      rec("p", 2, 3, "2026-11-24T09:03:00+09:00", "push-up"),
      rec("p", 3, 3, "2026-11-24T09:06:00+09:00", "push-up"),
      rec("p", 4, 3, "2026-11-24T09:09:00+09:00", "push-up"),
      rec("s", 1, 10, "2026-11-24T09:30:00+09:00", "squat"),
      rec("s", 2, 10, "2026-11-24T09:35:00+09:00", "squat"),
    ];
    expect(getWeekWorkouts(sets, NOW)).toEqual([
      { exerciseId: "squat", workouts: [[10, 10]] },
      { exerciseId: "push-up", workouts: [[3, 3, 3, 3]] },
    ]);
  });

  it("세트 번호 순서로 정렬하고, 같은 종목을 여러 번 했으면 먼저 한 운동부터 나눠 돌려준다", () => {
    const sets = [
      rec("b", 1, 8, "2026-11-25T09:00:00+09:00"),
      rec("a", 2, 9, "2026-11-23T10:05:00+09:00"),
      rec("a", 1, 10, "2026-11-23T10:00:00+09:00"),
    ];
    expect(getWeekWorkouts(sets, NOW)).toEqual([{ exerciseId: "squat", workouts: [[10, 9], [8]] }]);
  });

  it("지난주와 다음 주 기록은 넣지 않는다 (월요일 00:00 경계)", () => {
    const sets = [
      rec("old", 1, 5, "2026-11-22T23:59:59+09:00"),
      rec("now", 1, 6, "2026-11-23T00:00:00+09:00"),
      rec("next", 1, 7, "2026-11-30T00:00:00+09:00"),
    ];
    expect(getWeekWorkouts(sets, NOW)).toEqual([{ exerciseId: "squat", workouts: [[6]] }]);
  });
});
