"use client";

// Design Ref: §1 종목 상세 — 월별 세트 수 막대그래프.
// 값은 lib/trend.ts의 getMonthlyCounts 결과를 그대로 쓰고(집계·KST·기간은 건드리지 않는다), 여기서는 그리기만 한다.
// 막대 하나가 버튼이라, 누르면 선택한 달이 강조되고 그 달의 상세 기록이 열린다.
import type { MonthlyReps } from "@/lib/trend";

/** "2026-09" → "2026년 9월" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  return `${year}년 ${Number(m)}월`;
}

// 막대가 그려지는 높이(px). 위쪽 값 표시 줄(VALUE_ROW)을 뺀 만큼이 가장 큰 막대의 높이다.
const CHART_HEIGHT = 168;
const VALUE_ROW = 20;
const BAR_AREA = CHART_HEIGHT - VALUE_ROW;
// 이 개수 이하일 때는 모든 막대에 세트 수를 보여주고, 그보다 많으면(6개월·1년) 선택한 막대에만 보여준다.
const SHOW_ALL_VALUES_UP_TO = 6;

// 포인트 컬러(선택한 달)와 기본 막대 색
const ACCENT_BAR = "bg-blue-500";
const ACCENT_TEXT = "text-blue-500";
const BASE_BAR = "bg-zinc-400";

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
    <div role="group" aria-label="월별 세트 수 막대그래프" className="flex flex-col gap-1">
      {/* 막대 영역: 막대 하나가 세로 전체를 차지하는 버튼이라, 0세트인 달도 누르기 쉽다 */}
      <div
        className="flex items-end gap-0.5 border-b-2 border-zinc-400"
        style={{ height: CHART_HEIGHT }}
      >
        {chronological.map((m) => {
          const selected = m.month === selectedMonth;
          // 0세트는 얇은 선(2px)으로 "기록 없음"을 보여주고, 나머지는 최대값 기준 비율로 그린다.
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
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span
                aria-hidden="true"
                className={`whitespace-nowrap text-xs font-bold leading-5 ${selected ? ACCENT_TEXT : ""} ${
                  valueVisible ? "" : "invisible"
                }`}
              >
                {m.reps}회
              </span>
              <span
                aria-hidden="true"
                className={`w-full max-w-9 rounded-t ${selected ? ACCENT_BAR : BASE_BAR}`}
                style={{ height: barHeight }}
              />
            </button>
          );
        })}
      </div>

      {/* 월 라벨: `11월`처럼 짧게 쓰고, 연도는 첫 막대와 1월에만 작게 붙여 12개가 있어도 겹치지 않게 한다 */}
      <div className="flex gap-0.5" aria-hidden="true">
        {chronological.map((m, i) => {
          const [year, mm] = m.month.split("-");
          const showYear = i === 0 || mm === "01";
          const selected = m.month === selectedMonth;
          return (
            <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center leading-tight">
              <span
                className={`text-[11px] ${selected ? `${ACCENT_TEXT} font-bold` : "text-zinc-500"}`}
              >
                {Number(mm)}월
              </span>
              <span className="h-3 text-[9px] text-zinc-500">{showYear ? `'${year.slice(2)}` : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
