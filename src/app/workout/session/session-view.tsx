"use client";

// Design Ref: §1 세트 진행 — `스쿼트 · 1/4세트`, 목표 횟수 기본값, [−]/[+] 조정(1~100)
// Design Ref: §2 — 설정 화면에서 시작해 이동해 온 경우에만 열고, 새로고침·주소 직접 입력이면 진행 정보를 지우고 홈으로 보낸다.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { playRestEndAlert, unlockAlert } from "@/lib/alert";
import { isSessionEntryAllowed } from "@/lib/entry";
import { keepScreenAwake } from "@/lib/wake-lock";
import { extendRestEnd, restRemainingSec, shouldAlertRestEnd } from "@/lib/rest";
import { shuffleRestQuotes } from "@/lib/rest-quotes";
import { isNewBest } from "@/lib/records";
import NewBestBadge from "@/app/new-best-badge";
import { getExerciseName } from "@/lib/exercises";
import {
  clearActiveWorkout,
  loadSets,
  saveActiveWorkout,
  saveResultWorkoutId,
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

// 진행 중 운동의 원문 문자열을 스냅샷으로 쓴다 (서버에서는 undefined = 아직 모름).
function getActiveRaw(): string | null {
  try {
    return window.sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function parseActive(raw: string | null): ActiveWorkout | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as ActiveWorkout;
  } catch {
    return null;
  }
}

/** 남은 초를 `m:ss` 형태로 바꾼다. 예: 180 → "3:00" */
function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 휴식 타이머. 1초마다 숫자를 깎지 않고, 저장된 종료 시각과 현재 시각의 차이로
 * 남은 시간을 매번 다시 계산한다. (화면을 껐다 켜도 정확하다.)
 */
function RestTimer({
  restEndsAt,
  quote,
  onExtend,
  onSkip,
}: {
  restEndsAt: string;
  quote: string | null;
  onExtend: () => void;
  onSkip: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  const remainingSec = restRemainingSec(restEndsAt, now);

  // 휴식이 "끝나는 순간"에 한 번만 알린다. 이 화면에 들어왔을 때 이미 끝나 있던 휴식은 알리지 않고,
  // [건너뛰기]로 끝낸 휴식은 이 컴포넌트가 사라지므로 알리지 않는다.
  const prevRemainingRef = useRef(remainingSec);
  useEffect(() => {
    if (shouldAlertRestEnd(prevRemainingRef.current, remainingSec)) playRestEndAlert();
    prevRemainingRef.current = remainingSec;
  }, [remainingSec]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const id = window.setInterval(update, 500);
    // 화면을 다시 켰을 때 바로 다시 계산한다.
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  if (remainingSec === 0) {
    return (
      <p role="status" className="text-center text-2xl font-bold text-green-500">
        휴식 완료
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p role="timer" className="text-center text-2xl font-bold">
        휴식 중 {formatRemaining(remainingSec)}
      </p>
      {quote && (
        <p className="text-center text-sm leading-relaxed text-balance text-zinc-600 dark:text-zinc-400">
          {quote}
        </p>
      )}
      {/* 휴식 중에만 보인다 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onExtend}
          className="rounded-xl border-2 border-zinc-400 px-4 py-3 text-lg font-semibold"
        >
          +30초
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-xl border-2 border-zinc-400 px-4 py-3 text-lg font-semibold"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}

/** 세트 하나의 횟수 조정 영역. key가 바뀌면(다음 세트) 목표 횟수로 다시 채워진다. */
function SetStepper({
  workout,
  restQuote,
  newBest,
  onRestStart,
  onSetSaved,
}: {
  workout: ActiveWorkout;
  restQuote: string | null;
  newBest: number | null;
  onRestStart: () => void;
  onSetSaved: (newBestReps: number | null) => void;
}) {
  const router = useRouter();
  const [reps, setReps] = useState(workout.targetReps);
  // 오류가 난 동작을 함께 기억해, [재시도]가 같은 동작을 다시 하게 한다.
  // (종료에서 난 오류의 재시도가 새 세트를 저장하면 안 된다.)
  const [error, setError] = useState<{ message: string; retry: "complete" | "end" | "extend" | "skip" } | null>(null);
  const [saving, setSaving] = useState(false);
  const exerciseName = getExerciseName(workout.exerciseId) ?? workout.exerciseId;
  const allDone = workout.completedSets >= workout.plannedSets;
  const currentSet = Math.min(workout.completedSets + 1, workout.plannedSets);
  // 지금 세트가 마지막인지 (마지막일 때만 배지와 버튼 문구가 바뀐다)
  const isLastCurrentSet = currentSet === workout.plannedSets;

  // 결과 화면으로 간다. 새 세트는 추가하지 않고, 지금까지 완료한 세트만 보여준다.
  // (진행 중 운동 정보는 결과 화면에서 지운다. 여기서 지우면 홈으로 되돌아가 버린다.)
  function goToResult() {
    const saved = saveResultWorkoutId(workout.workoutId);
    if (!saved.ok) {
      setError({ message: saved.error, retry: "end" });
      return;
    }
    router.push("/workout/result");
  }

  // [세트 완료]: 저장에 성공한 뒤에만 완료 세트 수를 늘린다.
  // 저장에 실패하면 입력한 횟수를 그대로 두고 오류와 [재시도]를 보여준다.
  function handleComplete() {
    if (saving || allDone) return;
    // 화면을 누르는 이 순간에 소리를 미리 켜 둔다. (브라우저는 누른 뒤에만 소리를 허용한다.)
    unlockAlert();
    setSaving(true);
    const record = {
      workoutId: workout.workoutId,
      setNo: workout.completedSets + 1,
      exerciseId: workout.exerciseId,
      reps,
      completedAt: toKstTimestamp(),
    };
    const saved = saveSet(record);
    if (!saved.ok) {
      setError({ message: saved.error, retry: "complete" });
      setSaving(false);
      return;
    }
    // 이미 저장된 세트(duplicate)여도 기록은 남아 있으므로 다음 세트로 넘어간다.
    // 마지막 세트 뒤에는 휴식을 시작하지 않는다. (3세트면 타이머는 2번)
    const isLastSet = workout.completedSets + 1 >= workout.plannedSets;
    const advanced = saveActiveWorkout({
      ...workout,
      completedSets: workout.completedSets + 1,
      restEndsAt: isLastSet
        ? null
        : toKstTimestamp(new Date(Date.now() + workout.restSec * 1000)),
    });
    if (!advanced.ok) {
      setError({ message: advanced.error, retry: "complete" });
      setSaving(false);
      return;
    }
    setError(null);
    setSaving(false);
    // 방금 세트가 이 종목의 새 최고 기록이면 다음 화면에서 배지로 알린다. (읽기에 실패하면 알리지 않는다)
    const all = loadSets();
    onSetSaved(all.ok && isNewBest(all.value, record) ? reps : null);
    // 마지막 세트를 완료하면 바로 결과를 보여준다.
    if (isLastSet) {
      goToResult();
      return;
    }
    onRestStart();
    window.dispatchEvent(new Event(ACTIVE_CHANGE_EVENT));
  }

  // [+30초]: 휴식 중일 때만 현재 종료 시각을 30초 연장한다. (소리·진동은 실제로 끝날 때만 난다.)
  function handleExtend() {
    if (!workout.restEndsAt) return;
    const next = extendRestEnd(workout.restEndsAt, Date.now());
    if (next === null) return;
    const saved = saveActiveWorkout({ ...workout, restEndsAt: next });
    if (!saved.ok) {
      setError({ message: saved.error, retry: "extend" });
      return;
    }
    setError(null);
    window.dispatchEvent(new Event(ACTIVE_CHANGE_EVENT));
  }

  // [건너뛰기]: 휴식을 바로 끝내고 다음 세트로 넘어간다. 타이머가 사라질 뿐이라 소리·진동은 나지 않는다.
  function handleSkip() {
    const saved = saveActiveWorkout({ ...workout, restEndsAt: null });
    if (!saved.ok) {
      setError({ message: saved.error, retry: "skip" });
      return;
    }
    setError(null);
    window.dispatchEvent(new Event(ACTIVE_CHANGE_EVENT));
  }

  // [재시도]는 실패한 바로 그 동작을 다시 한다. (휴식 조작이 실패했는데 세트가 새로 저장되면 안 된다.)
  const retryAction =
    error?.retry === "end"
      ? goToResult
      : error?.retry === "extend"
        ? handleExtend
        : error?.retry === "skip"
          ? handleSkip
          : handleComplete;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xl font-semibold">
        <span>
          {exerciseName} · {currentSet}/{workout.plannedSets}세트
        </span>
        {isLastCurrentSet && (
          <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-white">
            마지막 세트
          </span>
        )}
      </p>

      {newBest !== null && <NewBestBadge reps={newBest} />}

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

      {workout.restEndsAt && (
        <RestTimer restEndsAt={workout.restEndsAt} quote={restQuote} onExtend={handleExtend} onSkip={handleSkip} />
      )}

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border-2 border-red-500 p-4">
          <p className="text-red-500">{error.message}</p>
          <button
            type="button"
            onClick={retryAction}
            className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white"
          >
            재시도
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={saving || allDone}
          onClick={handleComplete}
          className="rounded-2xl bg-foreground px-6 py-6 text-2xl font-bold text-background disabled:opacity-40"
        >
          {isLastCurrentSet ? "마지막 세트 저장하고 종료" : "세트 완료"}
        </button>
        <button
          type="button"
          onClick={goToResult}
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
  const [restQuote, setRestQuote] = useState<string | null>(null);
  // 방금 저장한 세트가 새 최고 기록이면 그 횟수. 다음 세트를 저장할 때 다시 정해진다. (세트마다 화면이 새로 만들어지므로 여기서 들고 있는다)
  const [newBest, setNewBest] = useState<number | null>(null);
  const restQuoteDeck = useRef<string[]>([]);
  const raw = useSyncExternalStore(subscribe, getActiveRaw, () => undefined);
  const workout = useMemo(() => (raw === undefined ? null : parseActive(raw)), [raw]);
  // 설정 화면에서 시작해 이동해 온 운동인지. 새로고침·주소 직접 입력이면 false다.
  const allowed = workout !== null && isSessionEntryAllowed(workout.workoutId);

  // 진행 중 운동이 없거나, 설정 화면을 거치지 않고 열린 경우(새로고침·주소 직접 입력):
  // 진행 정보를 지우고 홈으로 보낸다. (이미 완료한 세트 기록은 그대로 남는다.)
  useEffect(() => {
    if (raw === undefined) return; // 서버 렌더링 단계
    if (!allowed) {
      clearActiveWorkout();
      router.replace("/");
    }
  }, [raw, allowed, router]);

  // 운동 중에는 화면이 꺼지지 않게 한다. (화면이 꺼지면 휴식 종료 소리·진동이 늦어질 수 있다.)
  // 세트 진행 화면을 벗어나면(결과 화면·홈) 자동으로 놓는다.
  useEffect(() => {
    if (!allowed) return;
    return keepScreenAwake();
  }, [allowed]);

  if (raw === undefined || !allowed || workout === null) return null;

  function showNextRestQuote() {
    if (restQuoteDeck.current.length === 0) {
      restQuoteDeck.current = shuffleRestQuotes(restQuote);
    }
    setRestQuote(restQuoteDeck.current.pop() ?? null);
  }

  return (
    <SetStepper
      key={workout.completedSets}
      workout={workout}
      restQuote={restQuote}
      newBest={newBest}
      onRestStart={showNextRestQuote}
      onSetSaved={setNewBest}
    />
  );
}
