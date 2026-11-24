// 최고 기록: 종목별로 한 세트에서 가장 많이 한 반복 횟수. 무게(kg)는 기록하지 않으므로 횟수만 본다.
// 화면과 분리해 두어 경계(같은 횟수, 첫 기록, 같은 운동 안의 연속 갱신)를 테스트할 수 있다.
import type { ExerciseId } from "./exercises";
import { kstDateKey } from "./trend";
import type { SetRecord } from "./types";

export type BestRecord = { reps: number; date: string };

/**
 * 종목의 최고 기록(가장 큰 한 세트 횟수와 그 날짜 `YYYY-MM-DD`)을 돌려준다. 기록이 없으면 null.
 * 같은 횟수가 여러 번이면 가장 최근 날짜를 보여준다.
 */
export function getBestRecord(sets: SetRecord[], exerciseId: ExerciseId): BestRecord | null {
  let best: SetRecord | null = null;
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    if (
      best === null ||
      s.reps > best.reps ||
      (s.reps === best.reps && Date.parse(s.completedAt) > Date.parse(best.completedAt))
    ) {
      best = s;
    }
  }
  return best === null ? null : { reps: best.reps, date: kstDateKey(best.completedAt) };
}

/**
 * 방금 저장한 세트가 "새 최고 기록"인지 본다. 이전 기록(그 세트보다 먼저 완료한 같은 종목의 세트)이
 * 있고, 그중 가장 큰 횟수보다 strictly 많을 때만 true다.
 * - 그 종목의 첫 기록은 비교할 대상이 없으므로 축하하지 않는다.
 * - 같은 횟수는 넘은 것이 아니다.
 * - 같은 운동 안에서 앞선 세트도 이전 기록으로 센다. (12회 → 13회면 두 번 다 새 기록)
 */
export function isNewBest(sets: SetRecord[], record: SetRecord): boolean {
  const at = Date.parse(record.completedAt);
  let prevBest = 0;
  let hasPrev = false;
  for (const s of sets) {
    if (s.exerciseId !== record.exerciseId) continue;
    if (s.workoutId === record.workoutId && s.setNo === record.setNo) continue; // 자기 자신
    if (!(Date.parse(s.completedAt) < at)) continue;
    hasPrev = true;
    if (s.reps > prevBest) prevBest = s.reps;
  }
  return hasPrev && record.reps > prevBest;
}

/**
 * 운동 하나를 마친 뒤 결과 화면에 보여줄 "새 최고 기록" 횟수를 돌려준다. 없으면 null.
 * 그 운동을 시작하기 전의 기록만 비교 대상으로 삼아, 그 운동에서 가장 많이 한 세트가 넘었는지 본다.
 */
export function newBestOfWorkout(sets: SetRecord[], workoutId: string): number | null {
  const mine = sets.filter((s) => s.workoutId === workoutId);
  if (mine.length === 0) return null;
  const exerciseId = mine[0].exerciseId;
  const startedAt = Math.min(...mine.map((s) => Date.parse(s.completedAt)));
  const top = Math.max(...mine.map((s) => s.reps));
  let prevBest = 0;
  let hasPrev = false;
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || s.workoutId === workoutId) continue;
    if (!(Date.parse(s.completedAt) < startedAt)) continue;
    hasPrev = true;
    if (s.reps > prevBest) prevBest = s.reps;
  }
  return hasPrev && top > prevBest ? top : null;
}
