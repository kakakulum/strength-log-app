"use client";

// Design Ref: §1 운동 결과 — `완료 4세트 · 총 37회`, 세트별 횟수(`10·10·9·8회`), [홈으로]
import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { getExerciseName } from "@/lib/exercises";
import { clearActiveWorkout, loadResultWorkoutId, loadSets } from "@/lib/storage";

const subscribe = () => () => {};

export default function ResultView() {
  // 서버 렌더링 중에는 undefined(아직 모름), 브라우저에서는 결과로 보여줄 운동 ID(없으면 null)
  const workoutId = useSyncExternalStore(subscribe, loadResultWorkoutId, () => undefined);

  // 운동이 끝났으므로 진행 중 운동 정보를 지운다. (완료한 세트 기록은 그대로 남는다.)
  useEffect(() => {
    if (workoutId !== undefined) clearActiveWorkout();
  }, [workoutId]);

  // 읽기에 실패한 것을 "세트 없음"으로 보이게 하면 기록이 사라진 것처럼 오해하므로 구분한다.
  const { sets, readError } = useMemo(() => {
    if (!workoutId) return { sets: [], readError: null };
    const loaded = loadSets();
    if (!loaded.ok) return { sets: [], readError: loaded.error };
    return {
      sets: loaded.value
        .filter((s) => s.workoutId === workoutId)
        .sort((a, b) => a.setNo - b.setNo),
      readError: null,
    };
  }, [workoutId]);

  if (workoutId === undefined) return null;

  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  const exerciseName = sets[0] ? (getExerciseName(sets[0].exerciseId) ?? sets[0].exerciseId) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
      <h1 className="text-center text-2xl font-bold">운동 결과</h1>

      {readError ? (
        <p role="alert" className="text-center text-lg text-red-500">
          {readError}
        </p>
      ) : sets.length === 0 ? (
        <p className="text-center text-lg text-zinc-500">완료한 세트가 없습니다</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-semibold">{exerciseName}</p>
          <p className="text-3xl font-bold">
            완료 {sets.length}세트 · 총 {totalReps}회
          </p>
          <p className="text-xl text-zinc-500">{sets.map((s) => s.reps).join("·")}회</p>
        </div>
      )}

      <Link
        href="/"
        className="rounded-2xl bg-foreground px-6 py-5 text-center text-xl font-semibold text-background active:opacity-80"
      >
        홈으로
      </Link>
    </main>
  );
}
