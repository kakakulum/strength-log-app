"use client";

// 주간 목표 카드: 홈의 [운동 시작]·[기록·추세] 아래에 놓는 작은 카드.
// 목표가 없으면 [주간 목표 설정] 버튼만, 있으면 목표를 정한 종목의 이번 주 진행도를 보여준다.
// 목표는 운동 기록과 따로 저장되고, 새 주가 되면 진행도만 새로 센다. (계산은 lib/goals.ts)
import { useState, useSyncExternalStore } from "react";
import { EXERCISES } from "@/lib/exercises";
import { GOAL_MAX, GOAL_MIN, getGoalProgress, isValidGoal, type GoalProgress, type WeeklyGoals } from "@/lib/goals";
import { GOALS_CHANGE_EVENT, SETS_CHANGE_EVENT, loadSets, loadWeeklyGoals, saveWeeklyGoals } from "@/lib/storage";

type Snapshot = { error: string | null; goals: WeeklyGoals; progress: GoalProgress[] };

// 기록·목표가 바뀌거나 다른 탭에서 바뀔 때, 앱으로 돌아왔을 때(주가 바뀌었을 수 있다) 다시 읽는다.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SETS_CHANGE_EVENT, onChange);
  window.addEventListener(GOALS_CHANGE_EVENT, onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SETS_CHANGE_EVENT, onChange);
    window.removeEventListener(GOALS_CHANGE_EVENT, onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// 값이 같으면 같은 문자열이라 불필요하게 다시 그리지 않는다. 서버 렌더링 중에는 빈 문자열(아직 모름).
function getSnapshot(): string {
  const goals = loadWeeklyGoals();
  if (!goals.ok) return JSON.stringify({ error: goals.error, goals: {}, progress: [] } satisfies Snapshot);
  const sets = loadSets();
  if (!sets.ok) {
    // 기록을 읽지 못하면 진행도를 0으로 보이게 하지 않는다. (홈이 이미 읽기 실패 문구를 보여준다)
    return JSON.stringify({ error: null, goals: goals.value, progress: [] } satisfies Snapshot);
  }
  return JSON.stringify({ error: null, goals: goals.value, progress: getGoalProgress(sets.value, goals.value) } satisfies Snapshot);
}

function getServerSnapshot(): string {
  return "";
}

/** 목표 설정: 종목마다 목표 세트 수를 입력한다. 비워 두면 그 종목은 목표 없음(삭제). */
function GoalEditor({ initial, onClose }: { initial: WeeklyGoals; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(EXERCISES.map((e) => [e.id, initial[e.id] === undefined ? "" : String(initial[e.id])])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function save() {
    const next: WeeklyGoals = {};
    const nextErrors: Record<string, string> = {};
    for (const { id } of EXERCISES) {
      const text = values[id].trim();
      if (text === "") continue; // 목표 없음
      const n = /^\d+$/.test(text) ? Number(text) : NaN;
      if (!isValidGoal(n)) nextErrors[id] = `${GOAL_MIN}~${GOAL_MAX} 사이의 정수로 입력하세요.`;
      else next[id] = n;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const saved = saveWeeklyGoals(next);
    if (!saved.ok) {
      setSaveError(saved.error);
      return;
    }
    onClose();
  }

  return (
    <section aria-label="주간 목표 설정" className="flex flex-col gap-3 rounded-2xl border-2 border-zinc-400 p-4">
      <h2 className="text-base font-bold">주간 목표 설정</h2>
      <p className="text-sm text-zinc-500">
        목표로 삼을 종목만 주간 세트 수를 입력하세요. 비워 두면 그 종목은 목표가 없습니다. 목표는 다음 주에도 유지됩니다.
      </p>
      <ul className="flex flex-col gap-2">
        {EXERCISES.map(({ id, name }) => (
          <li key={id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label htmlFor={`goal-${id}`} className="w-24 shrink-0 font-semibold">
                {name}
              </label>
              <input
                id={`goal-${id}`}
                type="text"
                inputMode="numeric"
                placeholder="목표 없음"
                value={values[id]}
                aria-invalid={errors[id] ? true : undefined}
                aria-describedby={errors[id] ? `goal-${id}-error` : undefined}
                onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
                className="min-w-0 flex-1 rounded-lg border-2 border-zinc-400 bg-transparent px-3 py-2"
              />
              <span className="text-sm text-zinc-500">세트</span>
              {values[id] !== "" && (
                <button
                  type="button"
                  aria-label={`${name} 목표 삭제`}
                  onClick={() => setValues((v) => ({ ...v, [id]: "" }))}
                  className="text-sm text-zinc-500 underline"
                >
                  삭제
                </button>
              )}
            </div>
            {errors[id] && (
              <p id={`goal-${id}-error`} role="alert" className="text-sm text-red-500">
                {errors[id]}
              </p>
            )}
          </li>
        ))}
      </ul>
      {saveError && (
        <p role="alert" className="text-sm text-red-500">
          {saveError}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-foreground px-3 py-2 font-semibold text-background">
          저장
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border-2 border-zinc-400 px-3 py-2 font-semibold">
          취소
        </button>
      </div>
    </section>
  );
}

export default function GoalsCard() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [editing, setEditing] = useState(false);

  if (raw === "") return null;
  const snap = JSON.parse(raw) as Snapshot;

  if (snap.error) {
    return (
      <p role="alert" className="text-center text-sm text-red-500">
        {snap.error}
      </p>
    );
  }
  if (editing) return <GoalEditor initial={snap.goals} onClose={() => setEditing(false)} />;

  // 목표가 하나도 없을 때는 [주간 목표 설정] 버튼만 보여준다.
  if (Object.keys(snap.goals).length === 0) {
    return (
      <div className="flex justify-center">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-zinc-500 underline">
          주간 목표 설정
        </button>
      </div>
    );
  }

  return (
    <section aria-label="이번 주 목표" className="flex flex-col gap-2 rounded-2xl border border-zinc-300 px-4 py-3 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-500">이번 주 목표</h2>
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-zinc-500 underline">
          목표 수정
        </button>
      </div>
      {snap.progress.length === 0 ? (
        <p className="text-sm text-zinc-500">진행도를 불러오지 못했습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {snap.progress.map((p) => (
            <li key={p.exerciseId} className={`tabular-nums ${p.achieved ? "font-semibold text-green-600 dark:text-green-400" : ""}`}>
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
