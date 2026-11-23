"use client";

// Design Ref: §1 종목 상세 — 이번 주·지난주 세트 수와 전주 대비 변화. 기록이 없으면 안내 문구.
// (기간별 월간 추세는 PLAN 11번에서 이 화면 아래에 추가한다.)
import Link from "next/link";
import { getExerciseName, type ExerciseId } from "@/lib/exercises";
import { useSets } from "@/lib/use-sets";
import { getWeeklyStatus } from "@/lib/week";

export default function WeeklyView({ exerciseId }: { exerciseId: ExerciseId }) {
  const sets = useSets();
  const name = getExerciseName(exerciseId) ?? exerciseId;
  const status = sets === null ? null : getWeeklyStatus(sets, exerciseId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{name}</h1>
        <Link href="/history" className="text-sm text-zinc-500 underline">
          종목 목록
        </Link>
      </div>

      {status === null ? null : status.isEmpty ? (
        <p className="py-10 text-center text-zinc-500">아직 운동 기록이 없습니다</p>
      ) : (
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
      )}
    </main>
  );
}
