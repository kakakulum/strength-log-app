// Design Ref: §3 — 고정 종목 6개. 같은 종목은 항상 같은 ID로 집계한다.
export const EXERCISES = [
  { id: "squat", name: "스쿼트" },
  { id: "bench-press", name: "벤치프레스" },
  { id: "deadlift", name: "데드리프트" },
  { id: "lat-pulldown", name: "랫풀다운" },
  { id: "leg-press", name: "레그프레스" },
  { id: "push-up", name: "푸시업" },
] as const;

export type ExerciseId = (typeof EXERCISES)[number]["id"];

/** ID로 종목 이름을 찾는다. 목록에 없는 ID면 undefined. */
export function getExerciseName(id: string): string | undefined {
  return EXERCISES.find((e) => e.id === id)?.name;
}

/** 문자열이 고정 종목 ID인지 확인한다. */
export function isExerciseId(id: string): id is ExerciseId {
  return EXERCISES.some((e) => e.id === id);
}
