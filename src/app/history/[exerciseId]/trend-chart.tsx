"use client";

// Design Ref: §1 종목 상세 — 월별 총 반복 횟수 막대그래프. 각 월의 버튼을 누르면 상세 기록을 연다.
import type { MonthlyReps } from "@/lib/trend";

/** "2026-09" → "2026년 9월" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  return `${year}년 ${Number(m)}월`;
}

// 막대가 그려지는 높이(px). 위쪽 값 표시 줄(VALUE_ROW)을 뺀 만큼이 가장 큰 막대의 높이다.
const CHART_HEIGHT = 184;
const VALUE_ROW = 22;
const BAR_AREA = CHART_HEIGHT - VALUE_ROW;
// 최대 6개월까지는 모든 막대에 횟수를 표시한다. 1년 보기에서는 선택한 막대에만 표시한다.
const SHOW_ALL_VALUES_UP_TO = 6;

export default function TrendChart({
  months,
  selectedMonth,
  onSelect,
}: {
  /** getMonthlyReps 결과(최신 달부터) */
  months: MonthlyReps[];
  selectedMonth: string | null;
  onSelect: (month: string) => void;
}) {
  // 그래프는 시간 순서(왼쪽이 오래된 달, 오른쪽이 최신 달)로 그린다.
  const chronological = [...months].reverse();
  const max = Math.max(1, ...chronological.map((m) => m.reps));
  const showAllValues = chronological.length <= SHOW_ALL_VALUES_UP_TO;

  return (
    <div
      role="group"
      aria-label="월별 총 반복 횟수 막대그래프"
      className="relative rounded-2xl border border-zinc-200 bg-white px-2 pt-3 pb-2 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-3 flex flex-col justify-between" style={{ height: CHART_HEIGHT }}>
        <span className="border-t border-dashed border-zinc-200 dark:border-zinc-800" />
        <span className="border-t border-dashed border-zinc-200 dark:border-zinc-800" />
        <span className="border-t border-dashed border-zinc-200 dark:border-zinc-800" />
        <span className="border-t border-zinc-300 dark:border-zinc-700" />
      </div>
      <div className="relative flex">
        {chronological.map((m, i) => {
          const [year, mm] = m.month.split("-");
          const showYear = i === 0 || mm === "01";
          const selected = m.month === selectedMonth;
          // 0회는 얇은 선으로, 나머지는 최대값을 기준으로 표시한다.
          const barHeight = m.reps === 0 ? 2 : Math.max(4, Math.round((m.reps / max) * BAR_AREA));
          const valueVisible = selected || showAllValues;
          return (
            <button
              key={m.month}
              type="button"
              aria-pressed={selected}
              aria-label={`${formatMonth(m.month)} ${m.reps}회`}
              data-month={m.month}
              data-reps={m.reps}
              onClick={() => onSelect(m.month)}
              className={`group flex min-w-0 flex-1 flex-col items-center rounded-lg focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                selected ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span aria-hidden="true" className="flex w-full flex-col items-center justify-end" style={{ height: CHART_HEIGHT }}>
                <span className={`whitespace-nowrap px-0.5 text-xs font-semibold leading-5 tabular-nums ${
                  selected ? "text-blue-700 dark:text-blue-300" : "text-zinc-700 dark:text-zinc-300"
                } ${valueVisible ? "" : "invisible"} ${
                  !showAllValues && i === 0 ? "self-start" : !showAllValues && i === chronological.length - 1 ? "self-end" : ""
                }`}>
                  {m.reps}회
                </span>
                <span
                  className={`w-[72%] max-w-12 shrink-0 rounded-t-md ${
                    selected ? "bg-blue-600 dark:bg-blue-500" : "bg-blue-200 group-hover:bg-blue-300 dark:bg-slate-600 dark:group-hover:bg-slate-500"
                  }`}
                  style={{ height: barHeight }}
                />
              </span>
              <span aria-hidden="true" className={`mt-1.5 whitespace-nowrap text-[10px] leading-tight tabular-nums ${
                selected ? "font-bold text-blue-700 dark:text-blue-300" : "font-medium text-zinc-600 dark:text-zinc-400"
              }`}>
                {Number(mm)}월
              </span>
              <span aria-hidden="true" className="h-3.5 text-[9px] text-zinc-500 dark:text-zinc-400">{showYear ? `'${year.slice(2)}` : ""}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
