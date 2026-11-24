// Design Ref: §2-B 주간 현황 — KST 월요일 00:00 기준 주, 종목별 세트 합산, 전주 대비 표시 규칙
// Plan SC: 집계가 정답과 전부 일치 (이번 주 7세트·지난주 5세트 → `+2세트`)
import type { ExerciseId } from "./exercises";
import type { SetRecord } from "./types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 시각이 속한 한국 시간(KST) 주의 월요일 날짜를 "YYYY-MM-DD"로 돌려준다.
 * 기기의 시간대와 무관하게 항상 Asia/Seoul(UTC+9) 기준이다.
 * 한 주는 월요일 00:00 ~ 일요일 24:00이다.
 */
export function kstWeekStart(time: string | Date): string {
  const kst = new Date(new Date(time).getTime() + KST_OFFSET_MS);
  // getUTCDay: 0=일요일 … 6=토요일 → 월요일 기준으로 며칠 지났는지(월=0 … 일=6)
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7;
  const monday = new Date(kst.getTime() - daysSinceMonday * DAY_MS);
  return monday.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" 날짜에서 7일 전 날짜를 돌려준다. (지난주 월요일 계산용) */
function minusOneWeek(dateKey: string): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() - 7 * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export interface WeeklyStatus {
  /** 앱 전체에 기록이 하나도 없는지 (true면 `아직 운동 기록이 없습니다`를 보여준다) */
  isEmpty: boolean;
  /** 이번 주 완료 세트 수 */
  thisWeekCount: number;
  /** 지난주 완료 세트 수 */
  lastWeekCount: number;
  /** 지난주 칸에 보여줄 문구: `5세트` 또는 `기록 없음` */
  lastWeekLabel: string;
  /** 변화 칸에 보여줄 문구: `+2세트`, `-1세트`, `변화 없음`, `비교 데이터 없음` */
  changeLabel: string;
}

/**
 * 한 종목의 이번 주·지난주 세트 수와 전주 대비 변화를 계산한다.
 * - 앱에 기록된 완료 세트만 센다. (추정하거나 채워 넣지 않는다.)
 * - 지난주에 해당 종목 기록이 없으면 지난주 칸은 `기록 없음`, 변화 칸은 `비교 데이터 없음`.
 * - 두 주의 합이 같으면 `변화 없음`, 그 외에는 부호를 붙여 `+2세트`, `-1세트`.
 * @param now 기준 시각 (테스트에서 고정할 수 있도록 인자로 받는다)
 */
export function getWeeklyStatus(
  sets: SetRecord[],
  exerciseId: ExerciseId,
  now: Date = new Date(),
): WeeklyStatus {
  const thisWeek = kstWeekStart(now);
  const lastWeek = minusOneWeek(thisWeek);

  let thisWeekCount = 0;
  let lastWeekCount = 0;
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    const week = kstWeekStart(s.completedAt);
    if (week === thisWeek) thisWeekCount += 1;
    else if (week === lastWeek) lastWeekCount += 1;
  }

  const diff = thisWeekCount - lastWeekCount;
  let changeLabel: string;
  if (lastWeekCount === 0) changeLabel = "비교 데이터 없음";
  else if (diff === 0) changeLabel = "변화 없음";
  else changeLabel = `${diff > 0 ? "+" : "-"}${Math.abs(diff)}세트`;

  return {
    isEmpty: sets.length === 0,
    thisWeekCount,
    lastWeekCount,
    lastWeekLabel: lastWeekCount === 0 ? "기록 없음" : `${lastWeekCount}세트`,
    changeLabel,
  };
}

export interface WeekSummary {
  /** 이번 주(KST 월요일 00:00~) 완료 세트 수 (모든 종목 합) */
  sets: number;
  /** 이번 주에 운동한 날 수 (한국 시간 날짜 기준, 같은 날은 1일) */
  days: number;
}

/**
 * 홈에 보여줄 이번 주 요약: 모든 종목의 완료 세트 수와 운동한 날 수.
 * 앱에 기록된 세트만 센다. 날짜는 기기 시간대와 무관하게 한국 시간 기준이다.
 * @param now 기준 시각 (테스트에서 고정할 수 있도록 인자로 받는다)
 */
export function getWeekSummary(sets: SetRecord[], now: Date = new Date()): WeekSummary {
  const thisWeek = kstWeekStart(now);
  const days = new Set<string>();
  let count = 0;
  for (const s of sets) {
    if (kstWeekStart(s.completedAt) !== thisWeek) continue;
    count += 1;
    days.add(new Date(new Date(s.completedAt).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10));
  }
  return { sets: count, days: days.size };
}
