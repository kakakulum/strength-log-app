// 주간 목표 테스트: 목표 검증, 진행도 계산(목표 종목만·초과·새 주), 목표 저장(운동 기록과 별도)
import { beforeEach, describe, expect, it } from "vitest";
import type { ExerciseId } from "./exercises";
import { getGoalProgress, isValidGoal, sanitizeGoals } from "./goals";
import { loadSets, loadWeeklyGoals, saveSet, saveWeeklyGoals } from "./storage";
import type { SetRecord } from "./types";

function rec(workoutId: string, setNo: number, completedAt: string, exerciseId: ExerciseId): SetRecord {
  return { workoutId, setNo, exerciseId, reps: 10, completedAt };
}

// 2026-11-25(수). 이번 주 11-23(월)~11-29(일), 다음 주 11-30(월)~
const NOW = new Date("2026-11-25T12:00:00+09:00");
const NEXT_WEEK = new Date("2026-11-30T09:00:00+09:00");

function pushUps(n: number, day = "2026-11-24") {
  return Array.from({ length: n }, (_, i) => rec("p" + day, i + 1, `${day}T09:${String(i).padStart(2, "0")}:00+09:00`, "push-up"));
}

describe("목표 값 검증", () => {
  it("양의 정수(1~100)만 받는다", () => {
    for (const ok of [1, 10, 100]) expect(isValidGoal(ok), String(ok)).toBe(true);
    for (const bad of [0, -1, 1.5, 101, NaN, "10", null]) expect(isValidGoal(bad), String(bad)).toBe(false);
  });

  it("저장된 값에서 알 수 없는 종목과 올바르지 않은 값은 버리고 나머지는 그대로 둔다", () => {
    expect(sanitizeGoals({ squat: 8, "push-up": 10, "없는종목": 5, deadlift: 0, "bench-press": 2.5, "leg-press": "3" })).toEqual({
      squat: 8,
      "push-up": 10,
    });
    expect(sanitizeGoals(null)).toEqual({});
    expect(sanitizeGoals([1, 2])).toEqual({});
  });
});

describe("목표 진행도", () => {
  it("푸시업과 스쿼트에만 목표를 두면 그 두 종목만 고정 순서로 나온다 (기록이 있는 다른 종목은 안 나온다)", () => {
    const sets = [
      ...pushUps(6),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => rec("s", n, `2026-11-23T10:${10 + n}:00+09:00`, "squat")),
      rec("d", 1, "2026-11-24T10:00:00+09:00", "deadlift"),
    ];
    const progress = getGoalProgress(sets, { "push-up": 10, squat: 8 }, NOW);
    expect(progress.map((p) => p.label)).toEqual(["스쿼트 8 / 8세트 · 목표 달성 ✓", "푸시업 6 / 10세트 · 4세트 남음"]);
  });

  it("목표가 없으면 빈 목록이다", () => {
    expect(getGoalProgress(pushUps(3), {}, NOW)).toEqual([]);
  });

  it("세트를 저장하면 진행도가 1 올라가고 남은 세트가 1 줄어든다", () => {
    const before = getGoalProgress(pushUps(6), { "push-up": 10 }, NOW)[0];
    const after = getGoalProgress([...pushUps(6), rec("p2", 1, "2026-11-25T08:00:00+09:00", "push-up")], { "push-up": 10 }, NOW)[0];
    expect([before.done, before.remaining]).toEqual([6, 4]);
    expect([after.done, after.remaining]).toEqual([7, 3]);
  });

  it("목표를 넘겨도 실제 완료 세트 수를 그대로 보여주고 달성으로 표시한다", () => {
    const [p] = getGoalProgress(pushUps(12), { "push-up": 10 }, NOW);
    expect(p).toMatchObject({ done: 12, goal: 10, remaining: 0, achieved: true });
    expect(p.label).toBe("푸시업 12 / 10세트 · 목표 달성 ✓");
  });

  it("목표 세트 수와 같아지는 순간 달성이고 하나 모자라면 1세트 남음이다", () => {
    expect(getGoalProgress(pushUps(9), { "push-up": 10 }, NOW)[0].label).toBe("푸시업 9 / 10세트 · 1세트 남음");
    expect(getGoalProgress(pushUps(10), { "push-up": 10 }, NOW)[0].achieved).toBe(true);
  });

  it("새 주가 되면 목표는 그대로이고 진행도만 0부터 새로 센다 (월요일 00:00 경계)", () => {
    const goals = { "push-up": 10 };
    const sets = pushUps(6); // 이번 주 화요일 기록
    expect(getGoalProgress(sets, goals, NOW)[0].done).toBe(6);
    const next = getGoalProgress(sets, goals, NEXT_WEEK);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ goal: 10, done: 0, remaining: 10, achieved: false });
    // 일요일 23:59:59는 아직 이번 주, 월요일 00:00:00은 새 주
    expect(getGoalProgress(sets, goals, new Date("2026-11-29T23:59:59+09:00"))[0].done).toBe(6);
    expect(getGoalProgress(sets, goals, new Date("2026-11-30T00:00:00+09:00"))[0].done).toBe(0);
  });
});

describe("목표 저장 (운동 기록과 별도)", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    const local = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: local,
      sessionStorage: local,
      dispatchEvent: () => true,
    };
  });

  it("저장하면 다시 읽을 수 있고, 값이 없으면 빈 목표다", () => {
    expect(loadWeeklyGoals()).toEqual({ ok: true, value: {} });
    expect(saveWeeklyGoals({ "push-up": 10, squat: 8 }).ok).toBe(true);
    expect(loadWeeklyGoals()).toEqual({ ok: true, value: { squat: 8, "push-up": 10 } });
  });

  it("목표를 수정·삭제해도 운동 기록은 그대로 남는다", () => {
    saveSet(rec("w", 1, "2026-11-24T09:00:00+09:00", "push-up"));
    saveWeeklyGoals({ "push-up": 10, squat: 8 });
    saveWeeklyGoals({ "push-up": 12 }); // 수정 + 스쿼트 삭제
    expect(loadWeeklyGoals()).toEqual({ ok: true, value: { "push-up": 12 } });
    saveWeeklyGoals({}); // 모두 삭제
    expect(loadWeeklyGoals()).toEqual({ ok: true, value: {} });
    const sets = loadSets();
    expect(sets.ok && sets.value.length).toBe(1);
    expect(store.has("sets")).toBe(true);
  });

  it("올바르지 않은 값은 저장되지 않고, 깨진 저장값은 오류로 알린다", () => {
    saveWeeklyGoals({ squat: 0, "push-up": 5 } as never);
    expect(loadWeeklyGoals()).toEqual({ ok: true, value: { "push-up": 5 } });
    store.set("weeklyGoals", "{깨진");
    expect(loadWeeklyGoals().ok).toBe(false);
  });
});
