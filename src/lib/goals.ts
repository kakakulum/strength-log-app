// 주간 목표: 종목별로 "이번 주 목표 세트 수"를 정하고, 완료한 세트로 진행도를 보여준다.
// 목표는 운동 기록과 따로 저장하며 다음 주에도 유지된다. 진행도는 기존 주간 집계(week.ts)를 그대로 쓴다.
import { EXERCISES, getExerciseName, isExerciseId, type ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { getWeeklyStatus } from "./week";

/** 종목별 주간 목표 세트 수. 목표를 정하지 않은 종목은 키가 없다. */
export type WeeklyGoals = Partial<Record<ExerciseId, number>>;

/** 목표 세트 수의 범위 (양의 정수) */
export const GOAL_MIN = 1;
export const GOAL_MAX = 100;

export function isValidGoal(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= GOAL_MIN && value <= GOAL_MAX;
}

/**
 * 저장된 값(JSON을 읽은 것)에서 올바른 목표만 골라낸다.
 * 알 수 없는 종목, 양의 정수가 아닌 값은 버리고 나머지는 그대로 둔다. (고정 종목 순서로 정리)
 */
export function sanitizeGoals(raw: unknown): WeeklyGoals {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const goals: WeeklyGoals = {};
  for (const { id } of EXERCISES) {
    const value = source[id];
    if (isExerciseId(id) && isValidGoal(value)) goals[id] = value;
  }
  return goals;
}

export interface GoalProgress {
  exerciseId: ExerciseId;
  /** 화면에 보일 종목 이름 */
  name: string;
  /** 목표 세트 수 */
  goal: number;
  /** 이번 주 실제 완료 세트 수 (목표를 넘어도 그대로) */
  done: number;
  /** 남은 세트 수 (달성하면 0) */
  remaining: number;
  achieved: boolean;
  /** 예: `푸시업 6 / 10세트 · 4세트 남음`, `스쿼트 8 / 8세트 · 목표 달성 ✓` */
  label: string;
}

/**
 * 목표를 정한 종목만, 고정 종목 순서로 이번 주 진행도를 계산한다.
 * 완료 세트 수는 주간 집계(`getWeeklyStatus`, KST 월요일 00:00 기준)를 그대로 쓴다.
 * 새 주가 되면 완료 세트 수만 새로 세고, 목표(goals)는 바뀌지 않는다.
 * @param now 기준 시각 (테스트에서 고정할 수 있도록 인자로 받는다)
 */
export function getGoalProgress(sets: SetRecord[], goals: WeeklyGoals, now: Date = new Date()): GoalProgress[] {
  const result: GoalProgress[] = [];
  for (const { id } of EXERCISES) {
    const goal = goals[id];
    if (goal === undefined) continue;
    const done = getWeeklyStatus(sets, id, now).thisWeekCount;
    const remaining = Math.max(goal - done, 0);
    const achieved = done >= goal;
    const name = getExerciseName(id) ?? id;
    result.push({
      exerciseId: id,
      name,
      goal,
      done,
      remaining,
      achieved,
      label: `${name} ${done} / ${goal}세트 · ${achieved ? "목표 달성 ✓" : `${remaining}세트 남음`}`,
    });
  }
  return result;
}
