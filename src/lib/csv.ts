// Design Ref: §6 CSV 내보내기(nice) — 열은 날짜, 종목, 세트 번호, 횟수 순서로 고정, UTF-8 BOM으로 엑셀에서 한글이 깨지지 않게 한다.
import { getExerciseName } from "./exercises";
import { kstDateKey } from "./trend";
import type { SetRecord } from "./types";

/** UTF-8 BOM. 엑셀이 파일을 UTF-8로 인식하게 한다. */
export const CSV_BOM = "﻿";

export const CSV_HEADER = ["날짜", "종목", "세트 번호", "횟수"] as const;

/** 쉼표·따옴표·줄바꿈이 들어간 값은 따옴표로 감싼다. */
function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 전체 기록을 CSV 문자열로 만든다. (맨 앞에 BOM, 줄바꿈은 엑셀 호환을 위해 CRLF)
 * 완료 시각 순서(같으면 세트 번호 순서)로 정렬하고, 날짜는 한국 시간 기준 "YYYY-MM-DD"이다.
 */
export function buildCsv(sets: SetRecord[]): string {
  const sorted = [...sets].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime() || a.setNo - b.setNo,
  );
  const rows = sorted.map((s) => [
    kstDateKey(s.completedAt),
    getExerciseName(s.exerciseId) ?? s.exerciseId,
    s.setNo,
    s.reps,
  ]);
  const lines = [CSV_HEADER as readonly (string | number)[], ...rows].map((row) =>
    row.map(escapeCell).join(","),
  );
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

/** 내려받을 파일 이름. 예: 운동기록_2026-11-23.csv */
export function csvFileName(now: Date = new Date()): string {
  return `운동기록_${kstDateKey(now)}.csv`;
}
