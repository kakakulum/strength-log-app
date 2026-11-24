// Design Ref: §6 검증 데이터 — "오늘"을 기준으로 가상 기록을 만들고, 정답표를 함께 돌려준다.
// 정답표(expected)는 주간·추세 함수를 쓰지 않고, 만든 기록의 시각 문자열("2026-11-03T10:00:00+09:00")
// 앞부분만 직접 세어서 만든다. (집계 함수와 같은 코드로 정답을 만들면 검증이 되지 않기 때문이다.)
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";
import { kstWeekStart } from "./week";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD"에 days일을 더한 날짜 */
function addDays(dateKey: string, days: number): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM"에서 offset개월 전의 "YYYY-MM" (연도 넘김 포함) */
function monthMinus(currentMonth: string, offset: number): string {
  const [y, m] = currentMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/** 지난 12개월(이번 달 포함)의 "YYYY-MM" 목록, 최신 달부터 */
export function lastTwelveMonths(now: Date): string[] {
  const current = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
  return Array.from({ length: 12 }, (_, i) => monthMinus(current, i));
}

export interface WeeklyExpected {
  thisWeekCount: number;
  lastWeekLabel: string;
  changeLabel: string;
}

export interface SeedData {
  records: SetRecord[];
  /** 종목별 주간 정답 */
  weekly: Record<ExerciseId, WeeklyExpected>;
  /** 종목별·달별 정답 세트 수 (지난 12개월, 기록이 없는 달은 0) */
  monthly: Record<ExerciseId, Record<string, number>>;
  /** 종목별·달별 정답 총 반복 횟수 (화면의 월별 총 반복 횟수 그래프 값) */
  monthlyReps: Record<ExerciseId, Record<string, number>>;
}

/**
 * 가상 기록을 만든다. 기준 시각(now)이 언제든 같은 모양의 정답이 나오도록 상대 날짜로 만든다.
 * - 스쿼트: 이번 주 7세트 · 지난주 5세트 → `+2세트`, 그리고 지난 11개월에 흩어진 기록과 12개월 밖 기록
 * - 벤치프레스: 이번 주 3세트 · 지난주 없음 → `기록 없음` / `비교 데이터 없음`, 다른 종목 섞임 확인용 기록
 * - 데드리프트: 이번 주 4세트 · 지난주 4세트 → `변화 없음`
 * - 랫풀다운: 이번 주 2세트 · 지난주 3세트 → `-1세트`
 * - 레그프레스: 기록 없음
 * - 푸시업: 기록 없음
 */
export function createSeedData(now: Date = new Date()): SeedData {
  const records: SetRecord[] = [];
  let workoutCounter = 0;

  /** 한 번의 운동(세트 번호 1부터)을 기록으로 추가한다. */
  function addWorkout(exerciseId: ExerciseId, dateKey: string, hour: number, repsList: number[]) {
    workoutCounter += 1;
    const workoutId = `seed-${workoutCounter}`;
    repsList.forEach((reps, i) => {
      records.push({
        workoutId,
        setNo: i + 1,
        exerciseId,
        reps,
        // 시각은 항상 한국 시간 오프셋(+09:00) 문자열로 적는다.
        completedAt: `${dateKey}T${pad2(hour)}:${pad2(i * 5)}:00+09:00`,
      });
    });
  }

  /** 한 주(월요일 날짜 기준)에 count세트를 이틀(월·화)에 나눠 넣는다. 한 운동은 최대 4세트. */
  function addWeek(exerciseId: ExerciseId, mondayKey: string, count: number) {
    if (count === 0) return;
    const first = Math.min(count, 4);
    addWorkout(exerciseId, mondayKey, 10, Array(first).fill(10));
    if (count > first) addWorkout(exerciseId, addDays(mondayKey, 1), 10, Array(count - first).fill(9));
  }

  const thisMonday = kstWeekStart(now);
  const lastMonday = addDays(thisMonday, -7);

  // 주간 기록 (정답은 아래 weekly에 숫자로 직접 적는다)
  addWeek("squat", thisMonday, 7);
  addWeek("squat", lastMonday, 5);
  addWeek("bench-press", thisMonday, 3);
  addWeek("deadlift", thisMonday, 4);
  addWeek("deadlift", lastMonday, 4);
  addWeek("lat-pulldown", thisMonday, 2);
  addWeek("lat-pulldown", lastMonday, 3);

  // 지난 11개월에 흩어진 월간 기록 (각 달 10일). 앞쪽이 1개월 전.
  const squatByOffset = [2, 0, 5, 3, 0, 6, 1, 0, 4, 2, 1];
  const current = lastTwelveMonths(now)[0];
  squatByOffset.forEach((count, i) => {
    if (count > 0) addWorkout("squat", `${monthMinus(current, i + 1)}-10`, 10, Array(count).fill(10));
  });
  // 12개월 밖(12개월 전) 기록: 1년 범위에 들어가면 안 된다.
  addWorkout("squat", `${monthMinus(current, 12)}-10`, 10, Array(7).fill(10));
  // 다른 종목이 섞이는지 확인용 (벤치프레스 2개월 전 3세트)
  addWorkout("bench-press", `${monthMinus(current, 2)}-10`, 10, Array(3).fill(12));

  // 월간 정답: 만든 기록의 시각 문자열 앞 7글자("YYYY-MM")를 직접 센다.
  const months = lastTwelveMonths(now);
  const exercises: ExerciseId[] = ["squat", "bench-press", "deadlift", "lat-pulldown", "leg-press", "push-up"];
  const monthly = Object.fromEntries(
    exercises.map((id) => [
      id,
      Object.fromEntries(
        months.map((month) => [
          month,
          records.filter((r) => r.exerciseId === id && r.completedAt.slice(0, 7) === month).length,
        ]),
      ),
    ]),
  ) as SeedData["monthly"];

  // 월간 반복 횟수 정답: 같은 방식으로 기록의 횟수를 직접 더한다.
  const monthlyReps = Object.fromEntries(
    exercises.map((id) => [
      id,
      Object.fromEntries(
        months.map((month) => [
          month,
          records
            .filter((r) => r.exerciseId === id && r.completedAt.slice(0, 7) === month)
            .reduce((sum, r) => sum + r.reps, 0),
        ]),
      ),
    ]),
  ) as SeedData["monthlyReps"];

  const weekly: SeedData["weekly"] = {
    squat: { thisWeekCount: 7, lastWeekLabel: "5세트", changeLabel: "+2세트" },
    "bench-press": { thisWeekCount: 3, lastWeekLabel: "기록 없음", changeLabel: "비교 데이터 없음" },
    deadlift: { thisWeekCount: 4, lastWeekLabel: "4세트", changeLabel: "변화 없음" },
    "lat-pulldown": { thisWeekCount: 2, lastWeekLabel: "3세트", changeLabel: "-1세트" },
    "leg-press": { thisWeekCount: 0, lastWeekLabel: "기록 없음", changeLabel: "비교 데이터 없음" },
    "push-up": { thisWeekCount: 0, lastWeekLabel: "기록 없음", changeLabel: "비교 데이터 없음" },
  };

  return { records, weekly, monthly, monthlyReps };
}
