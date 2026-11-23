"use client";

// Design Ref: §1 종목 상세 — 위: 이번 주·지난주 세트 수와 전주 대비 변화, 아래: 기간 선택과 월별 세트 수 막대그래프.
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
} from "@/lib/trend";
import type { SetRecord } from "@/lib/types";
import { useSets } from "@/lib/use-sets";
import { getWeeklyStatus } from "@/lib/week";
import TrendChart, { formatMonth } from "./trend-chart";

/** "2026-11-03" → "11월 3일" */
function formatDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
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
      className="flex flex-col gap-2 rounded-2xl border-2 border-foreground p-4"
    >
      <h3 className="font-semibold">
        {formatMonth(month)} 운동 기록 · <span className="text-blue-500">총 {reps}회</span>
      </h3>
      {workouts.length === 0 ? (
        <p className="text-zinc-500">이 달에는 기록이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workouts.map((w) => (
            <li key={w.workoutId} className="flex flex-col rounded-xl bg-zinc-500/10 px-3 py-2">
              <span className="text-sm text-zinc-500">
                {formatDay(w.date)} · {name}
              </span>
              <span className="text-lg font-semibold">{w.reps.join(" · ")}회</span>
              <span className="text-sm text-zinc-500">
                {w.reps.length}세트 · 총 {w.reps.reduce((a, b) => a + b, 0)}회
              </span>
            </li>
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
    <section aria-label="최근 운동 5회" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-500">최근 운동 5회</h2>
      <ul className="flex flex-col gap-2">
        {workouts.map((w) => (
          <li key={w.workoutId} className="flex flex-col rounded-xl bg-zinc-500/10 px-3 py-2">
            <span className="text-sm text-zinc-500">{formatDay(w.date)}</span>
            <span className="text-lg font-semibold">{w.reps.join(" · ")}회</span>
            <span className="text-sm text-zinc-500">
              {w.reps.length}세트 · 총 {w.reps.reduce((a, b) => a + b, 0)}회
            </span>
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
      <h2 className="text-sm font-semibold text-zinc-500">월별 총 반복 횟수</h2>

      <div role="group" aria-label="조회 기간" className="grid grid-cols-4 gap-2">
        {RANGES.map((r) => (
          <button
            key={r.months}
            type="button"
            aria-pressed={range === r.months}
            onClick={() => setRange(r.months)}
            className={`rounded-xl border-2 px-2 py-2 text-base font-semibold ${
              range === r.months
                ? "border-foreground bg-foreground text-background"
                : "border-zinc-400"
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

export default function WeeklyView({ exerciseId }: { exerciseId: ExerciseId }) {
  const state = useSets();
  const name = getExerciseName(exerciseId) ?? exerciseId;
  const sets = state.status === "ok" ? state.sets : null;
  const status = sets === null ? null : getWeeklyStatus(sets, exerciseId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{name}</h1>
        <Link href="/history" className="text-sm text-zinc-500 underline">
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
          <section aria-label="주간 현황" className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-500">주간 현황</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-2xl border-2 border-zinc-400 p-5 text-lg">
              <dt className="text-zinc-500">이번 주</dt>
              <dd className="text-right font-semibold">{status.thisWeekCount}세트</dd>
              <dt className="text-zinc-500">지난주</dt>
              <dd className="text-right font-semibold">{status.lastWeekLabel}</dd>
              <dt className="text-zinc-500">전주 대비</dt>
              <dd className="text-right text-2xl font-bold">{status.changeLabel}</dd>
            </dl>
          </section>

          <RecentWorkouts sets={sets} exerciseId={exerciseId} />

          <TrendSection sets={sets} exerciseId={exerciseId} />
        </>
      )}
    </main>
  );
}
