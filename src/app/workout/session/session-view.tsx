"use client";

// Design Ref: §1 세트 진행 — `스쿼트 · 1/4세트`, 목표 횟수 기본값, [−]/[+] 조정(1~100)
// Design Ref: §2 — 새로고침·주소 직접 입력으로 들어오면 진행 정보를 지우고 홈으로 보낸다.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getExerciseName } from "@/lib/exercises";
import {
  clearActiveWorkout,
  saveActiveWorkout,
  saveSet,
  toKstTimestamp,
} from "@/lib/storage";
import { LIMITS, type ActiveWorkout } from "@/lib/types";

const ACTIVE_KEY = "activeWorkout";
// 같은 탭에서 진행 정보를 바꿨을 때 화면을 다시 읽게 하는 알림 이름
// (storage 이벤트는 다른 탭에서 바뀔 때만 발생하기 때문)
const ACTIVE_CHANGE_EVENT = "activeworkout-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(ACTIVE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(ACTIVE_CHANGE_EVENT, onChange);
};
const subscribeNone = () => () => {};

// 진행 중 운동의 원문 문자열을 스냅샷으로 쓴다 (서버에서는 undefined = 아직 모름).
function getActiveRaw(): string | null {
  try {
    return window.sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

// 이 화면이 새로고침으로 열렸는지 확인한다.
function getIsReload(): boolean {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type === "reload";
}

function parseActive(raw: string | null): ActiveWorkout | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as ActiveWorkout;
  } catch {
    return null;
  }
}

/** 세트 하나의 횟수 조정 영역. key가 바뀌면(다음 세트) 목표 횟수로 다시 채워진다. */
function SetStepper({ workout }: { workout: ActiveWorkout }) {
  const [reps, setReps] = useState(workout.targetReps);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exerciseName = getExerciseName(workout.exerciseId) ?? workout.exerciseId;
  const allDone = workout.completedSets >= workout.plannedSets;
  const currentSet = Math.min(workout.completedSets + 1, workout.plannedSets);

  // [세트 완료]: 저장에 성공한 뒤에만 완료 세트 수를 늘린다.
  // 저장에 실패하면 입력한 횟수를 그대로 두고 오류와 [재시도]를 보여준다.
  function handleComplete() {
    if (saving || allDone) return;
    setSaving(true);
    const saved = saveSet({
      workoutId: workout.workoutId,
      setNo: workout.completedSets + 1,
      exerciseId: workout.exerciseId,
      reps,
      completedAt: toKstTimestamp(),
    });
    if (!saved.ok) {
      setError(saved.error);
      setSaving(false);
      return;
    }
    // 이미 저장된 세트(duplicate)여도 기록은 남아 있으므로 다음 세트로 넘어간다.
    const advanced = saveActiveWorkout({
      ...workout,
      completedSets: workout.completedSets + 1,
    });
    if (!advanced.ok) {
      setError(advanced.error);
      setSaving(false);
      return;
    }
    setError(null);
    setSaving(false);
    window.dispatchEvent(new Event(ACTIVE_CHANGE_EVENT));
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
      <p className="text-center text-xl font-semibold">
        {exerciseName} · {currentSet}/{workout.plannedSets}세트
      </p>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="횟수 줄이기"
          disabled={reps <= LIMITS.reps.min}
          onClick={() => setReps((r) => Math.max(LIMITS.reps.min, r - 1))}
          className="h-16 w-16 rounded-full border-2 border-foreground text-3xl font-bold disabled:opacity-30"
        >
          −
        </button>
        <p className="min-w-[6ch] text-center text-5xl font-bold" aria-live="polite">
          {reps}회
        </p>
        <button
          type="button"
          aria-label="횟수 늘리기"
          disabled={reps >= LIMITS.reps.max}
          onClick={() => setReps((r) => Math.min(LIMITS.reps.max, r + 1))}
          className="h-16 w-16 rounded-full border-2 border-foreground text-3xl font-bold disabled:opacity-30"
        >
          +
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border-2 border-red-500 p-4">
          <p className="text-red-500">{error}</p>
          <button
            type="button"
            onClick={handleComplete}
            className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white"
          >
            재시도
          </button>
        </div>
      )}

      {allDone && (
        <p className="text-center text-lg font-semibold">모든 세트를 완료했습니다</p>
      )}

      {/* [운동 종료]의 동작은 PLAN 8번에서 연결한다. */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={saving || allDone}
          onClick={handleComplete}
          className="rounded-2xl bg-foreground px-6 py-6 text-2xl font-bold text-background disabled:opacity-40"
        >
          세트 완료
        </button>
        <button
          type="button"
          disabled
          className="rounded-2xl border-2 border-zinc-400 px-6 py-4 text-lg font-semibold disabled:opacity-40"
        >
          운동 종료
        </button>
      </div>
    </main>
  );
}

export default function SessionView() {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, getActiveRaw, () => undefined);
  const isReload = useSyncExternalStore(subscribeNone, getIsReload, () => false);
  const workout = useMemo(() => (raw === undefined ? null : parseActive(raw)), [raw]);

  // 진행 중 운동이 없거나 새로고침으로 열린 경우: 진행 정보를 지우고 홈으로 보낸다.
  // (이미 완료한 세트 기록은 그대로 남는다.)
  useEffect(() => {
    if (raw === undefined) return; // 서버 렌더링 단계
    if (isReload || workout === null) {
      clearActiveWorkout();
      router.replace("/");
    }
  }, [raw, isReload, workout, router]);

  if (raw === undefined || isReload || workout === null) return null;
  return <SetStepper key={workout.completedSets} workout={workout} />;
}
