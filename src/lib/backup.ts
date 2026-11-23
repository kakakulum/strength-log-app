// 기록 백업·복원(JSON). CSV 내보내기와 별개이며, 복원할 때 다시 읽을 수 있도록 형식을 고정한다.
// 파일은 이 브라우저 안에서만 만들고 읽는다 (서버로 보내지 않는다).
import { isSetRecord, type Result } from "./storage";
import { kstDateKey } from "./trend";
import type { SetRecord } from "./types";

export const BACKUP_APP = "strength-log";
export const BACKUP_VERSION = 1;

/** 백업 파일 내용(JSON 문자열)을 만든다. 완료 시각 순서로 정렬한다. */
export function buildBackup(sets: SetRecord[], now: Date = new Date()): string {
  const sorted = [...sets].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime() || a.setNo - b.setNo,
  );
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      sets: sorted.map((s) => ({
        workoutId: s.workoutId,
        setNo: s.setNo,
        exerciseId: s.exerciseId,
        reps: s.reps,
        completedAt: s.completedAt,
      })),
    },
    null,
    2,
  );
}

/** 내려받을 파일 이름. 예: 운동기록_백업_2026-11-23.json */
export function backupFileName(now: Date = new Date()): string {
  return `운동기록_백업_${kstDateKey(now)}.json`;
}

/**
 * 백업 파일 내용을 검증해 기록 목록으로 돌려준다.
 * 형식·버전이 다르거나, 기록 중 하나라도 올바르지 않으면(종목, 1~100 정수 횟수, 세트 번호, 시각)
 * 일부만 읽지 않고 파일 전체를 거부한다. 파일 안에서 운동 ID + 세트 번호가 겹치면 먼저 나온 것만 쓴다.
 */
export function parseBackup(text: string): Result<SetRecord[]> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "백업 파일이 아닙니다. (JSON을 읽지 못했습니다.)" };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "백업 파일 형식이 올바르지 않습니다." };
  }
  const d = data as Record<string, unknown>;
  if (d.app !== BACKUP_APP || d.version !== BACKUP_VERSION || !Array.isArray(d.sets)) {
    return { ok: false, error: "이 앱의 백업 파일이 아니거나 지원하지 않는 버전입니다." };
  }
  const seen = new Set<string>();
  const records: SetRecord[] = [];
  for (let i = 0; i < d.sets.length; i++) {
    const item: unknown = d.sets[i];
    if (!isSetRecord(item) || Number.isNaN(new Date(item.completedAt).getTime())) {
      return { ok: false, error: `백업 파일의 ${i + 1}번째 기록이 올바르지 않습니다.` };
    }
    const key = `${item.workoutId}#${item.setNo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 알 수 없는 항목은 버리고 필요한 항목만 가져온다.
    records.push({
      workoutId: item.workoutId,
      setNo: item.setNo,
      exerciseId: item.exerciseId,
      reps: item.reps,
      completedAt: item.completedAt,
    });
  }
  return { ok: true, value: records };
}
