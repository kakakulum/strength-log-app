"use client";

// Design Ref: §1 운동 설정 — 종목, 세트 수, 목표 반복 횟수, 휴식 시간, 마지막 설정값 불러오기
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { EXERCISES, isExerciseId, type ExerciseId } from "@/lib/exercises";
import { allowSessionEntry } from "@/lib/entry";
import { loadSettings, saveActiveWorkout, saveSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS, LIMITS } from "@/lib/types";
import { getRecentWorkouts } from "@/lib/trend";
import { useSets } from "@/lib/use-sets";

/** "2026-11-03" → "11월 3일" */
function formatDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 선택한 종목의 가장 최근 운동을 참고용으로만 보여준다 (목표 횟수·세트 수는 바꾸지 않는다) */
function LastWorkout({ exerciseId }: { exerciseId: ExerciseId }) {
  const state = useSets();
  if (state.status !== "ok") return null;
  const last = getRecentWorkouts(state.sets, exerciseId, 1)[0];
  return (
    <section
      aria-label="지난 운동 참고"
      className="flex flex-col rounded-xl bg-zinc-500/10 px-3 py-2"
    >
      <span className="text-sm text-zinc-500">
        지난 운동{last ? ` · ${formatDay(last.date)}` : ""}
      </span>
      {last ? (
        <>
          <span className="text-lg font-semibold">{last.reps.join(" · ")}회</span>
          <span className="text-sm text-zinc-500">
            {last.reps.length}세트 · 총 {last.reps.reduce((a, b) => a + b, 0)}회
          </span>
        </>
      ) : (
        <span className="text-zinc-500">이 종목은 아직 운동 기록이 없습니다</span>
      )}
    </section>
  );
}

// 브라우저에서만 저장소를 읽을 수 있으므로, 화면이 브라우저에 붙은 뒤에만 폼을 보여준다.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

/** 입력 문자열이 min~max 정수인지 확인하고, 아니면 사유 문구를 돌려준다. */
function checkInt(
  value: string,
  label: string,
  min: number,
  max: number,
): { value: number; error: null } | { value: null; error: string } {
  const n = Number(value);
  if (value.trim() === "" || !Number.isInteger(n) || n < min || n > max) {
    return { value: null, error: `${label}: ${min}~${max} 사이의 정수를 입력해 주세요.` };
  }
  return { value: n, error: null };
}

function SetupFields() {
  const router = useRouter();
  // 마지막 설정값이 있으면 불러오고, 없으면 기본값(4세트·10회·180초)을 쓴다.
  const [initial] = useState(() => {
    const loaded = loadSettings();
    return loaded.ok && loaded.value ? loaded.value : DEFAULT_SETTINGS;
  });
  const [exerciseId, setExerciseId] = useState<ExerciseId>(initial.exerciseId);
  const [plannedSets, setPlannedSets] = useState(String(initial.plannedSets));
  const [targetReps, setTargetReps] = useState(String(initial.targetReps));
  const [restSec, setRestSec] = useState(String(initial.restSec));
  const [saveError, setSaveError] = useState<string | null>(null);

  const setsCheck = checkInt(plannedSets, "세트 수", LIMITS.plannedSets.min, LIMITS.plannedSets.max);
  const repsCheck = checkInt(targetReps, "목표 반복 횟수", LIMITS.reps.min, LIMITS.reps.max);
  const restCheck = checkInt(restSec, "휴식 시간(초)", LIMITS.restSec.min, LIMITS.restSec.max);
  const valid = setsCheck.error === null && repsCheck.error === null && restCheck.error === null;

  function handleStart() {
    if (setsCheck.value === null || repsCheck.value === null || restCheck.value === null) return;
    const settings = {
      exerciseId,
      plannedSets: setsCheck.value,
      targetReps: repsCheck.value,
      restSec: restCheck.value,
    };
    // 설정값은 다음 운동에서 불러오도록 저장하고, 진행 중 운동 정보를 만든다.
    const savedSettings = saveSettings(settings);
    const workoutId = crypto.randomUUID();
    const savedActive = saveActiveWorkout({
      ...settings,
      workoutId,
      completedSets: 0,
      restEndsAt: null,
    });
    if (!savedSettings.ok || !savedActive.ok) {
      setSaveError(!savedActive.ok ? savedActive.error : "설정을 저장하지 못했습니다.");
      return;
    }
    // 이 문서 안에서 설정 화면을 거쳐 시작한 운동만 세트 진행 화면이 열어 준다.
    allowSessionEntry(workoutId);
    router.push("/workout/session");
  }

  const inputClass =
    "w-full rounded-xl border-2 border-zinc-400 bg-transparent px-4 py-3 text-lg";

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-zinc-500">종목</legend>
        <div className="grid grid-cols-2 gap-2">
          {EXERCISES.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={exerciseId === e.id}
              onClick={() => isExerciseId(e.id) && setExerciseId(e.id)}
              className={`rounded-xl border-2 px-3 py-3 text-base font-semibold ${
                exerciseId === e.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-zinc-400"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        <LastWorkout exerciseId={exerciseId} />
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-zinc-500">
          세트 수 ({LIMITS.plannedSets.min}~{LIMITS.plannedSets.max})
        </span>
        <input
          type="number"
          inputMode="numeric"
          className={inputClass}
          value={plannedSets}
          onChange={(e) => setPlannedSets(e.target.value)}
        />
        {setsCheck.error && <span className="text-sm text-red-500">{setsCheck.error}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-zinc-500">
          세트당 목표 반복 횟수 ({LIMITS.reps.min}~{LIMITS.reps.max})
        </span>
        <input
          type="number"
          inputMode="numeric"
          className={inputClass}
          value={targetReps}
          onChange={(e) => setTargetReps(e.target.value)}
        />
        {repsCheck.error && <span className="text-sm text-red-500">{repsCheck.error}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-zinc-500">
          휴식 시간(초) ({LIMITS.restSec.min}~{LIMITS.restSec.max})
        </span>
        <input
          type="number"
          inputMode="numeric"
          className={inputClass}
          value={restSec}
          onChange={(e) => setRestSec(e.target.value)}
        />
        {restCheck.error && <span className="text-sm text-red-500">{restCheck.error}</span>}
      </label>

      {saveError && <p className="text-sm text-red-500">{saveError}</p>}

      <button
        type="button"
        disabled={!valid}
        onClick={handleStart}
        className="rounded-2xl bg-foreground px-6 py-5 text-xl font-semibold text-background disabled:opacity-40"
      >
        시작
      </button>
    </div>
  );
}

export default function SetupForm() {
  const isClient = useIsClient();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">운동 설정</h1>
        <Link href="/" className="text-sm text-zinc-500 underline">
          홈으로
        </Link>
      </div>
      {isClient ? <SetupFields /> : null}
    </main>
  );
}
