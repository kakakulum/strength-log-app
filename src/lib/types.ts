// Design Ref: §2 데이터 형식 — 세트 기록·설정·진행 중 운동
import type { ExerciseId } from "./exercises";

/** 한국 시간 오프셋이 붙은 시각 문자열. 예: "2026-11-23T18:30:00+09:00" */
export type KstTimestamp = string;

/** 세트 기록 1건. (workoutId + setNo)가 같으면 같은 세트로 보고 중복 저장하지 않는다. */
export interface SetRecord {
  workoutId: string;
  setNo: number;
  exerciseId: ExerciseId;
  /** 반복 횟수, 1~100 정수 */
  reps: number;
  completedAt: KstTimestamp;
}

/** 운동 시작 화면의 마지막 설정값 */
export interface WorkoutSettings {
  exerciseId: ExerciseId;
  /** 예정 세트 수, 1~10 */
  plannedSets: number;
  /** 세트당 목표 반복 횟수, 1~100 */
  targetReps: number;
  /** 휴식 시간(초), 10~600 */
  restSec: number;
}

/** 진행 중인 운동 (sessionStorage, 탭을 닫으면 사라짐) */
export interface ActiveWorkout extends WorkoutSettings {
  workoutId: string;
  /** 완료한 세트 수 */
  completedSets: number;
  /** 휴식 종료 시각, 휴식 중이 아니면 null */
  restEndsAt: KstTimestamp | null;
}

/** 입력 범위 (PRD: 횟수 1~100, 설계에서 정한 값: 세트 수 1~10, 휴식 10~600초) */
export const LIMITS = {
  reps: { min: 1, max: 100 },
  plannedSets: { min: 1, max: 10 },
  restSec: { min: 10, max: 600 },
} as const;

/** 처음 실행할 때의 기본 설정 (마지막 설정값이 없을 때) */
export const DEFAULT_SETTINGS: WorkoutSettings = {
  exerciseId: "squat",
  plannedSets: 4,
  targetReps: 10,
  restSec: 180,
};
