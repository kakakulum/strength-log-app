// Design Ref: §2 — 브라우저 저장소(localStorage/sessionStorage)에 기록을 저장·조회한다.
// Plan SC: 운동 ID + 세트 번호 중복 저장 방지, 저장 실패 시 오류 반환, 서버 전송 없음.
import { isExerciseId } from "./exercises";
import {
  LIMITS,
  type ActiveWorkout,
  type KstTimestamp,
  type SetRecord,
  type WorkoutSettings,
} from "./types";

const SETS_KEY = "sets";
const SETTINGS_KEY = "settings";
const ACTIVE_KEY = "activeWorkout";

/** 성공 또는 한국어 오류 메시지를 돌려주는 결과 형식 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주어진 시각을 한국 시간 오프셋 문자열로 바꾼다. 예: "2026-11-23T18:30:00+09:00" */
export function toKstTimestamp(date: Date = new Date()): KstTimestamp {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return kst.toISOString().replace(/\.\d{3}Z$/, "+09:00");
}

/** 한국 시간 오프셋 문자열을 Date로 되돌린다. */
export function fromKstTimestamp(ts: KstTimestamp): Date {
  return new Date(ts);
}

function getStorage(kind: "local" | "session"): Result<Storage> {
  try {
    if (typeof window === "undefined") {
      return { ok: false, error: "브라우저에서만 저장할 수 있습니다." };
    }
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    return { ok: true, value: storage };
  } catch {
    // 사생활 보호 모드 등으로 저장소 접근이 막힌 경우
    return { ok: false, error: "브라우저 저장소를 사용할 수 없습니다." };
  }
}

function isValidReps(reps: unknown): reps is number {
  return (
    typeof reps === "number" &&
    Number.isInteger(reps) &&
    reps >= LIMITS.reps.min &&
    reps <= LIMITS.reps.max
  );
}

/** 같은 탭에서 세트 기록을 바꿨을 때 화면을 다시 읽게 하는 알림 이름 (storage 이벤트는 다른 탭에서만 발생) */
export const SETS_CHANGE_EVENT = "sets-change";

export function isSetRecord(value: unknown): value is SetRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.workoutId === "string" &&
    typeof v.setNo === "number" &&
    Number.isInteger(v.setNo) &&
    v.setNo >= 1 &&
    typeof v.exerciseId === "string" &&
    isExerciseId(v.exerciseId) &&
    isValidReps(v.reps) &&
    typeof v.completedAt === "string"
  );
}

/** 저장된 세트 기록 전체를 읽는다. 기록이 없으면 빈 목록. */
export function loadSets(): Result<SetRecord[]> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    const raw = storage.value.getItem(SETS_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "저장된 기록 형식이 올바르지 않습니다." };
    }
    return { ok: true, value: parsed.filter(isSetRecord) };
  } catch {
    return { ok: false, error: "기록을 읽지 못했습니다." };
  }
}

/**
 * 세트 기록 1건을 저장한다.
 * - 횟수가 1~100 정수가 아니면 저장하지 않고 오류를 돌려준다.
 * - 운동 ID + 세트 번호가 이미 있으면 중복 저장하지 않고 성공(duplicate: true)으로 돌려준다.
 */
export function saveSet(record: SetRecord): Result<{ duplicate: boolean }> {
  if (!isSetRecord(record)) {
    return { ok: false, error: "횟수는 1~100 사이의 정수여야 합니다." };
  }
  const loaded = loadSets();
  if (!loaded.ok) return loaded;

  const exists = loaded.value.some(
    (s) => s.workoutId === record.workoutId && s.setNo === record.setNo,
  );
  if (exists) return { ok: true, value: { duplicate: true } };

  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    storage.value.setItem(SETS_KEY, JSON.stringify([...loaded.value, record]));
    return { ok: true, value: { duplicate: false } };
  } catch {
    // 저장 공간 부족·저장 차단 등
    return { ok: false, error: "기록을 저장하지 못했습니다. 다시 시도해 주세요." };
  }
}

/** 저장된 원본 배열을 그대로 읽는다. (형식이 낯선 항목도 지우지 않고 보존하기 위해 쓴다.) */
function loadRawSets(): Result<unknown[]> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    const raw = storage.value.getItem(SETS_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, error: "저장된 기록 형식이 올바르지 않습니다." };
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "기록을 읽지 못했습니다." };
  }
}

function writeRawSets(items: unknown[], failMessage: string): Result<null> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    storage.value.setItem(SETS_KEY, JSON.stringify(items));
  } catch {
    return { ok: false, error: failMessage };
  }
  window.dispatchEvent(new Event(SETS_CHANGE_EVENT));
  return { ok: true, value: null };
}

/**
 * 저장된 세트의 반복 횟수만 고친다. (운동 ID, 세트 번호, 날짜, 종목은 그대로)
 * 하나라도 1~100 정수가 아니거나 대상 세트가 없으면 아무것도 바꾸지 않고 오류를 돌려준다.
 */
export function updateSetReps(
  workoutId: string,
  changes: { setNo: number; reps: number }[],
): Result<null> {
  if (changes.some((c) => !isValidReps(c.reps))) {
    return { ok: false, error: "횟수는 1~100 사이의 정수여야 합니다." };
  }
  const loaded = loadRawSets();
  if (!loaded.ok) return loaded;
  const items = loaded.value.map((x) => (typeof x === "object" && x !== null ? { ...x } : x));
  for (const c of changes) {
    const target = items.find(
      (x) =>
        isSetRecord(x) && (x as SetRecord).workoutId === workoutId && (x as SetRecord).setNo === c.setNo,
    ) as SetRecord | undefined;
    if (!target) return { ok: false, error: "수정할 기록을 찾지 못했습니다." };
    target.reps = c.reps;
  }
  return writeRawSets(items, "수정한 횟수를 저장하지 못했습니다. 다시 시도해 주세요.");
}

/**
 * 백업에서 읽은 기록을 기존 기록에 합친다. (기존 기록은 그대로 두고 새 기록만 추가)
 * 운동 ID + 세트 번호가 이미 있으면 추가하지 않는다. 저장에 실패하면 기존 기록은 그대로다.
 */
export function mergeSets(incoming: SetRecord[]): Result<{ added: number; skipped: number }> {
  const loaded = loadRawSets();
  if (!loaded.ok) return loaded;
  const keys = new Set(
    loaded.value.filter(isSetRecord).map((s) => `${s.workoutId}#${s.setNo}`),
  );
  const toAdd: SetRecord[] = [];
  for (const s of incoming) {
    const key = `${s.workoutId}#${s.setNo}`;
    if (keys.has(key)) continue;
    keys.add(key);
    toAdd.push(s);
  }
  if (toAdd.length > 0) {
    const written = writeRawSets([...loaded.value, ...toAdd], "기록을 복원하지 못했습니다. 기존 기록은 그대로입니다.");
    if (!written.ok) return written;
  }
  return { ok: true, value: { added: toAdd.length, skipped: incoming.length - toAdd.length } };
}

// 종목별 마지막 설정: { "squat": {...}, "deadlift": {...} }. 기존 "settings"(마지막 설정 1개)도 계속 쓴다.
const SETTINGS_BY_EXERCISE_KEY = "settingsByExercise";

function isValidSettings(v: Partial<WorkoutSettings> | null | undefined): v is WorkoutSettings {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.exerciseId === "string" &&
    isExerciseId(v.exerciseId) &&
    isValidReps(v.targetReps) &&
    typeof v.plannedSets === "number" &&
    Number.isInteger(v.plannedSets) &&
    v.plannedSets >= LIMITS.plannedSets.min &&
    v.plannedSets <= LIMITS.plannedSets.max &&
    typeof v.restSec === "number" &&
    Number.isInteger(v.restSec) &&
    v.restSec >= LIMITS.restSec.min &&
    v.restSec <= LIMITS.restSec.max
  );
}

/** 마지막 운동 설정값(종목 상관없이 가장 최근 1개)을 읽는다. 없거나 올바르지 않으면 null. */
export function loadSettings(): Result<WorkoutSettings | null> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    const raw = storage.value.getItem(SETTINGS_KEY);
    if (raw === null) return { ok: true, value: null };
    const v = JSON.parse(raw) as Partial<WorkoutSettings>;
    return { ok: true, value: isValidSettings(v) ? v : null };
  } catch {
    return { ok: false, error: "설정을 읽지 못했습니다." };
  }
}

/**
 * 한 종목의 마지막 설정을 읽는다. 종목별로 저장한 값이 우선이고,
 * 없으면 기존 "마지막 설정"이 그 종목의 것일 때 그 값을 쓴다. 둘 다 없으면 null(앱 기본값을 쓴다).
 */
export function loadSettingsFor(exerciseId: string): Result<WorkoutSettings | null> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    const rawMap = storage.value.getItem(SETTINGS_BY_EXERCISE_KEY);
    if (rawMap !== null) {
      const map = JSON.parse(rawMap) as Record<string, Partial<WorkoutSettings>>;
      const own = map?.[exerciseId];
      if (isValidSettings(own) && own.exerciseId === exerciseId) return { ok: true, value: own };
    }
  } catch {
    return { ok: false, error: "설정을 읽지 못했습니다." };
  }
  const last = loadSettings();
  if (!last.ok) return last;
  return { ok: true, value: last.value && last.value.exerciseId === exerciseId ? last.value : null };
}

/** 운동 설정값을 저장한다: 마지막 설정과, 그 종목의 설정(종목별)을 함께 저장한다. */
export function saveSettings(settings: WorkoutSettings): Result<null> {
  const storage = getStorage("local");
  if (!storage.ok) return storage;
  try {
    let map: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(storage.value.getItem(SETTINGS_BY_EXERCISE_KEY) ?? "{}");
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        map = parsed as Record<string, unknown>;
      }
    } catch {
      // 종목별 저장값이 깨져 있으면 새로 만든다.
    }
    map[settings.exerciseId] = settings;
    storage.value.setItem(SETTINGS_BY_EXERCISE_KEY, JSON.stringify(map));
    storage.value.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: "설정을 저장하지 못했습니다." };
  }
}

/** 진행 중인 운동을 읽는다 (탭을 닫으면 사라지는 sessionStorage). */
export function loadActiveWorkout(): Result<ActiveWorkout | null> {
  const storage = getStorage("session");
  if (!storage.ok) return storage;
  try {
    const raw = storage.value.getItem(ACTIVE_KEY);
    return { ok: true, value: raw === null ? null : (JSON.parse(raw) as ActiveWorkout) };
  } catch {
    return { ok: false, error: "진행 중인 운동을 읽지 못했습니다." };
  }
}

/** 진행 중인 운동을 저장한다. */
export function saveActiveWorkout(workout: ActiveWorkout): Result<null> {
  const storage = getStorage("session");
  if (!storage.ok) return storage;
  try {
    storage.value.setItem(ACTIVE_KEY, JSON.stringify(workout));
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: "진행 상태를 저장하지 못했습니다." };
  }
}

/** 진행 중인 운동 정보를 지운다 (완료한 세트 기록은 그대로 남는다). */
export function clearActiveWorkout(): void {
  const storage = getStorage("session");
  if (!storage.ok) return;
  try {
    storage.value.removeItem(ACTIVE_KEY);
  } catch {
    // 지우기에 실패해도 다음 진입 때 다시 정리되므로 무시한다.
  }
}

const RESULT_KEY = "resultWorkoutId";

/** 결과 화면에서 보여줄 운동 ID를 저장한다 (탭을 닫으면 사라지는 sessionStorage). */
export function saveResultWorkoutId(workoutId: string): Result<null> {
  const storage = getStorage("session");
  if (!storage.ok) return storage;
  try {
    storage.value.setItem(RESULT_KEY, workoutId);
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: "결과를 표시하지 못했습니다." };
  }
}

/** 결과 화면에서 보여줄 운동 ID를 읽는다. 없으면 null. */
export function loadResultWorkoutId(): string | null {
  const storage = getStorage("session");
  if (!storage.ok) return null;
  try {
    return storage.value.getItem(RESULT_KEY);
  } catch {
    return null;
  }
}
