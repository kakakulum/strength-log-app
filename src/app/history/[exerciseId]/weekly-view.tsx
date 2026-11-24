"use client";

// Design Ref: §1 종목 상세 — 주간 세트 수, 월별 총 반복 횟수 막대그래프와 최근 운동 기록.
// 막대를 누르면 그 달의 운동 기록(날짜·종목·세트별 횟수)을 연다. 기록이 없으면 안내 문구, 읽기 실패면 오류 문구.
import Link from "next/link";
import { useState } from "react";
import { getExerciseName, type ExerciseId } from "@/lib/exercises";
import {
  RANGES,
  getMonthDetail,
  getMonthlyReps,
  getRecentWorkouts,
  type RangeMonths,
  type WorkoutDetail,
} from "@/lib/trend";
import { getBestRecord } from "@/lib/records";
import { updateSetReps } from "@/lib/storage";
import { LIMITS, type SetRecord } from "@/lib/types";
import { useSets } from "@/lib/use-sets";
import { getWeeklyStatus } from "@/lib/week";
import TrendChart, { formatMonth } from "./trend-chart";

/** "2026-11-03" → "11월 3일" */
function formatDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 월별 상세의 운동 하나. [횟수 수정]으로 세트별 반복 횟수만 1~100 정수로 고칠 수 있다. */
function WorkoutRow({
  sets,
  workout,
  name,
}: {
  sets: SetRecord[];
  workout: WorkoutDetail;
  name: string;
}) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 이 운동의 세트(번호 순서). 표시되는 횟수와 같은 순서다.
  const records = sets
    .filter((s) => s.workoutId === workout.workoutId && s.exerciseId === workout.exerciseId)
    .sort((a, b) => a.setNo - b.setNo);

  function startEdit() {
    setDrafts(records.map((r) => String(r.reps)));
    setError(null);
    setEditing(true);
  }

  function save() {
    // 수정하는 동안 다른 탭에서 이 운동의 세트가 바뀌었으면 입력칸과 맞지 않으므로 저장하지 않는다.
    if (drafts.length !== records.length) {
      setEditing(false);
      return;
    }
    const changes: { setNo: number; reps: number }[] = [];
    for (let i = 0; i < records.length; i++) {
      const text = (drafts[i] ?? "").trim();
      const n = Number(text);
      if (text === "" || !Number.isInteger(n) || n < LIMITS.reps.min || n > LIMITS.reps.max) {
        setError(`${records[i].setNo}세트: ${LIMITS.reps.min}~${LIMITS.reps.max} 사이의 정수를 입력해 주세요.`);
        return;
      }
      if (n !== records[i].reps) changes.push({ setNo: records[i].setNo, reps: n });
    }
    if (changes.length > 0) {
      const saved = updateSetReps(workout.workoutId, changes);
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
    }
    setEditing(false);
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-3 dark:bg-zinc-900">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {formatDay(workout.date)} · {name}
      </span>
      {editing ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {records.map((r, i) => (
              <label key={r.setNo} className="flex flex-col gap-1 text-sm text-zinc-500">
                {r.setNo}세트 횟수
                <input
                  type="number"
                  inputMode="numeric"
                  value={drafts[i] ?? ""}
                  aria-invalid={error !== null}
                  aria-describedby={error ? `reps-error-${workout.workoutId}` : undefined}
                  onChange={(e) =>
                    setDrafts((d) => d.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  className="w-full rounded-lg border-2 border-zinc-400 bg-transparent px-3 py-2 text-lg text-foreground"
                />
              </label>
            ))}
          </div>
          {error && (
            <p id={`reps-error-${workout.workoutId}`} role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-foreground px-3 py-2 font-semibold text-background"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border-2 border-zinc-400 px-3 py-2 font-semibold"
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="text-lg font-semibold tabular-nums">{workout.reps.join(" · ")}회</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {workout.reps.length}세트 · 총 {workout.reps.reduce((a, b) => a + b, 0)}회
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="mt-0.5 min-h-9 self-start rounded-md px-1 text-sm font-semibold text-blue-700 hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"
          >
            횟수 수정
          </button>
        </>
      )}
    </li>
  );
}

/** 선택한 달의 운동 기록: 날짜, 종목, 세트별 횟수 */
function MonthDetail({
  sets,
  exerciseId,
  month,
  reps,
}: {
  sets: SetRecord[];
  exerciseId: ExerciseId;
  month: string;
  /** 그 달의 총 반복 횟수 (막대 위 숫자와 같은 값) */
  reps: number;
}) {
  const name = getExerciseName(exerciseId) ?? exerciseId;
  const workouts = getMonthDetail(sets, exerciseId, month);

  return (
    <section
      aria-label={`${formatMonth(month)} 운동 기록`}
      className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-500/30 dark:bg-zinc-950"
    >
      <h3 className="font-semibold">
        {formatMonth(month)} 운동 기록 · <span className="text-blue-700 dark:text-blue-300">총 {reps}회</span>
      </h3>
      {workouts.length === 0 ? (
        <p className="text-zinc-500">이 달에는 기록이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workouts.map((w) => (
            <WorkoutRow key={w.workoutId} sets={sets} workout={w} name={name} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** 최근 운동 5회: 날짜, 세트별 횟수, 세트 수, 총 반복 횟수를 최신순으로 나란히 보여준다 */
function RecentWorkouts({ sets, exerciseId }: { sets: SetRecord[]; exerciseId: ExerciseId }) {
  const workouts = getRecentWorkouts(sets, exerciseId, 5);
  return (
    <section aria-labelledby="recent-workouts-title" className="flex flex-col gap-3">
      <h2 id="recent-workouts-title" className="text-lg font-bold">최근 운동 5회</h2>
      {workouts.length === 0 && <p className="text-zinc-500">이 종목은 아직 운동 기록이 없습니다</p>}
      <ul className="flex flex-col divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {workouts.map((w) => (
          <li key={w.workoutId} className="flex flex-col gap-1 px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <time dateTime={w.date} className="text-zinc-600 dark:text-zinc-400">{formatDay(w.date)}</time>
              <span className="text-zinc-600 tabular-nums dark:text-zinc-400">
                {w.reps.length}세트 · <strong className="font-bold text-foreground">총 {w.reps.reduce((a, b) => a + b, 0)}회</strong>
              </span>
            </div>
            <span className="text-lg font-semibold tabular-nums">{w.reps.join(" · ")}회</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrendSection({ sets, exerciseId }: { sets: SetRecord[]; exerciseId: ExerciseId }) {
  const [range, setRange] = useState<RangeMonths>(3);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const months = getMonthlyReps(sets, exerciseId, range);
  // 기간을 바꿔서 선택한 달이 목록에서 사라지면 선택을 해제한 것으로 본다.
  const openMonth = months.some((m) => m.month === selectedMonth) ? selectedMonth : null;

  return (
    <section aria-label="월간 추세" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">월별 총 반복 횟수</h2>

      <div role="group" aria-label="조회 기간" className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {RANGES.map((r) => (
          <button
            key={r.months}
            type="button"
            aria-pressed={range === r.months}
            onClick={() => setRange(r.months)}
            className={`min-h-10 rounded-lg px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${
              range === r.months
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-blue-300 dark:ring-zinc-700"
                : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 막대를 누르면 선택, 같은 막대를 다시 누르면 닫는다 (기존 월 행과 같은 동작) */}
      <TrendChart
        months={months}
        selectedMonth={openMonth}
        onSelect={(month) => setSelectedMonth(openMonth === month ? null : month)}
      />

      {/* 선택한 달의 운동 기록은 그래프 바로 아래에 연다 */}
      {openMonth && (
        <MonthDetail
          sets={sets}
          exerciseId={exerciseId}
          month={openMonth}
          reps={months.find((m) => m.month === openMonth)?.reps ?? 0}
        />
      )}
    </section>
  );
}

/** 최고 기록: 이 종목에서 한 세트로 가장 많이 한 횟수와 그 날짜 */
function BestRecord({ sets, exerciseId }: { sets: SetRecord[]; exerciseId: ExerciseId }) {
  const best = getBestRecord(sets, exerciseId);
  if (best === null) return null;
  return (
    <section aria-labelledby="best-record-title" className="flex items-baseline justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
      <h2 id="best-record-title" className="text-sm font-semibold text-amber-800 dark:text-amber-300">최고 기록</h2>
      <p className="text-right tabular-nums">
        <span className="text-3xl font-bold tracking-tight">{best.reps}<span className="ml-1 text-base font-semibold">회</span></span>
        <time dateTime={best.date} className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">{formatDay(best.date)}</time>
      </p>
    </section>
  );
}

export default function WeeklyView({ exerciseId }: { exerciseId: ExerciseId }) {
  const state = useSets();
  const name = getExerciseName(exerciseId) ?? exerciseId;
  const sets = state.status === "ok" ? state.sets : null;
  const status = sets === null ? null : getWeeklyStatus(sets, exerciseId);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-7 px-4 py-7 sm:px-6 sm:py-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        <Link href="/history" className="inline-flex min-h-10 items-center rounded-full border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
          종목 목록
        </Link>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="py-10 text-center text-red-500">
          {state.message}
        </p>
      ) : sets === null || status === null ? null : status.isEmpty ? (
        <p className="py-10 text-center text-zinc-500">아직 운동 기록이 없습니다</p>
      ) : (
        <>
          <section aria-labelledby="weekly-status-title" className="rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 to-white px-4 pt-4 pb-3.5 dark:border-blue-950 dark:from-[#101c32] dark:to-zinc-950">
            <h2 id="weekly-status-title" className="text-sm font-semibold text-blue-800 dark:text-blue-300">주간 현황</h2>
            <dl className="mt-2 grid grid-cols-2 tabular-nums">
              <div className="col-span-2 flex items-baseline justify-between gap-3 pb-3">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">이번 주</dt>
                <dd className="text-right text-4xl font-bold tracking-tight">
                  {status.thisWeekCount}<span className="ml-1 text-base font-semibold">세트</span>
                </dd>
              </div>
              <div className="border-t border-blue-100 pt-3 pr-3 dark:border-blue-900/60">
                <dt className="text-xs text-zinc-600 dark:text-zinc-400">지난주</dt>
                <dd className="mt-1 text-sm font-semibold">{status.lastWeekLabel}</dd>
              </div>
              <div className="border-t border-l border-blue-100 pt-3 pl-3 dark:border-blue-900/60">
                <dt className="text-xs text-zinc-600 dark:text-zinc-400">전주 대비</dt>
                <dd className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-300">{status.changeLabel}</dd>
              </div>
            </dl>
          </section>

          <BestRecord sets={sets} exerciseId={exerciseId} />

          <TrendSection sets={sets} exerciseId={exerciseId} />

          <RecentWorkouts sets={sets} exerciseId={exerciseId} />
        </>
      )}
    </main>
  );
}
