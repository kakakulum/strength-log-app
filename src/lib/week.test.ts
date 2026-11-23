// 주간 집계 정답 테스트: 정답을 미리 계산해 두고 함수 결과와 비교한다.
import { describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getWeeklyStatus, kstWeekStart } from "./week";

// 기준 시각: 2026-11-25(수) 12:00 KST → 이번 주 월요일 11-23, 지난주 월요일 11-16
const NOW = new Date("2026-11-25T12:00:00+09:00");

let counter = 0;
/** 지정한 시각에 완료한 세트 기록 만들기 */
function set(completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord {
  counter += 1;
  return { workoutId: `w${counter}`, setNo: 1, exerciseId, reps: 10, completedAt };
}
/** 같은 날 n세트 만들기 */
function sets(n: number, completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord[] {
  return Array.from({ length: n }, () => set(completedAt, exerciseId));
}

describe("kstWeekStart — KST 월요일 00:00 기준 주", () => {
  it("월요일 00:00:00은 새 주의 시작", () => {
    expect(kstWeekStart("2026-11-23T00:00:00+09:00")).toBe("2026-11-23");
  });
  it("일요일 23:59:59는 이전 주", () => {
    expect(kstWeekStart("2026-11-22T23:59:59+09:00")).toBe("2026-11-16");
  });
  it("UTC로 표기해도 KST 기준으로 나눈다 (UTC 일요일 15:00 = KST 월요일 00:00)", () => {
    expect(kstWeekStart("2026-11-22T15:00:00Z")).toBe("2026-11-23");
    expect(kstWeekStart("2026-11-22T14:59:59Z")).toBe("2026-11-16");
  });
  it("주중 날짜는 그 주 월요일을 돌려준다", () => {
    expect(kstWeekStart("2026-11-25T12:00:00+09:00")).toBe("2026-11-23");
    expect(kstWeekStart("2026-11-29T23:59:59+09:00")).toBe("2026-11-23");
  });
  it("월 경계를 넘는 주도 맞다 (2026-12-02 수 → 11-30 월)", () => {
    expect(kstWeekStart("2026-12-02T09:00:00+09:00")).toBe("2026-11-30");
  });
});

describe("getWeeklyStatus — 이번 주·지난주 세트 수와 전주 대비", () => {
  it("이번 주 7세트, 지난주 5세트 → +2세트", () => {
    const data = [
      ...sets(7, "2026-11-24T10:00:00+09:00"),
      ...sets(5, "2026-11-18T10:00:00+09:00"),
    ];
    const r = getWeeklyStatus(data, "squat", NOW);
    expect(r.thisWeekCount).toBe(7);
    expect(r.lastWeekCount).toBe(5);
    expect(r.lastWeekLabel).toBe("5세트");
    expect(r.changeLabel).toBe("+2세트");
    expect(r.isEmpty).toBe(false);
  });

  it("이번 주 4세트, 지난주 5세트 → -1세트", () => {
    const data = [
      ...sets(4, "2026-11-23T00:00:00+09:00"),
      ...sets(5, "2026-11-22T23:59:59+09:00"),
    ];
    expect(getWeeklyStatus(data, "squat", NOW).changeLabel).toBe("-1세트");
  });

  it("양쪽이 같으면 변화 없음", () => {
    const data = [
      ...sets(4, "2026-11-24T10:00:00+09:00"),
      ...sets(4, "2026-11-17T10:00:00+09:00"),
    ];
    expect(getWeeklyStatus(data, "squat", NOW).changeLabel).toBe("변화 없음");
  });

  it("지난주 기록이 없으면 `기록 없음` / `비교 데이터 없음`", () => {
    const r = getWeeklyStatus(sets(3, "2026-11-24T10:00:00+09:00"), "squat", NOW);
    expect(r.thisWeekCount).toBe(3);
    expect(r.lastWeekLabel).toBe("기록 없음");
    expect(r.changeLabel).toBe("비교 데이터 없음");
  });

  it("이번 주에 기록이 없고 지난주만 있으면 지난주 전체가 감소로 표시된다", () => {
    const r = getWeeklyStatus(sets(5, "2026-11-17T10:00:00+09:00"), "squat", NOW);
    expect(r.thisWeekCount).toBe(0);
    expect(r.changeLabel).toBe("-5세트");
  });

  it("다른 종목과 두 주 밖의 기록은 세지 않는다", () => {
    const data = [
      ...sets(2, "2026-11-24T10:00:00+09:00", "squat"),
      ...sets(9, "2026-11-24T10:00:00+09:00", "bench-press"),
      ...sets(6, "2026-11-10T10:00:00+09:00", "squat"), // 2주 전
    ];
    const r = getWeeklyStatus(data, "squat", NOW);
    expect(r.thisWeekCount).toBe(2);
    expect(r.lastWeekCount).toBe(0);
  });

  it("앱 전체에 기록이 없으면 isEmpty", () => {
    expect(getWeeklyStatus([], "squat", NOW).isEmpty).toBe(true);
  });

  it("다른 종목 기록만 있으면 isEmpty는 false (앱 전체 기준)", () => {
    const r = getWeeklyStatus(sets(1, "2026-11-24T10:00:00+09:00", "deadlift"), "squat", NOW);
    expect(r.isEmpty).toBe(false);
    expect(r.thisWeekCount).toBe(0);
  });

  it("기준 시각이 일요일 밤이어도 같은 주로 센다", () => {
    const sundayNight = new Date("2026-11-29T23:59:59+09:00");
    const r = getWeeklyStatus(sets(2, "2026-11-23T00:00:00+09:00"), "squat", sundayNight);
    expect(r.thisWeekCount).toBe(2);
  });

  it("기준 시각이 월요일 00:00이면 직전 일요일 기록은 지난주", () => {
    const monday = new Date("2026-11-30T00:00:00+09:00");
    const r = getWeeklyStatus(sets(3, "2026-11-29T23:59:59+09:00"), "squat", monday);
    expect(r.thisWeekCount).toBe(0);
    expect(r.lastWeekCount).toBe(3);
  });
});
