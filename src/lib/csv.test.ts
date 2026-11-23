import { describe, expect, it } from "vitest";
import type { SetRecord } from "./types";
import { CSV_BOM, buildCsv, csvFileName } from "./csv";

const rec = (
  workoutId: string,
  setNo: number,
  reps: number,
  completedAt: string,
  exerciseId: SetRecord["exerciseId"] = "squat",
): SetRecord => ({ workoutId, setNo, exerciseId, reps, completedAt });

describe("buildCsv — 엑셀용 CSV", () => {
  it("맨 앞에 UTF-8 BOM이 있다", () => {
    expect(buildCsv([]).startsWith(CSV_BOM)).toBe(true);
    expect(CSV_BOM).toBe("﻿");
  });

  it("열은 날짜, 종목, 세트 번호, 횟수 순서로 고정", () => {
    expect(buildCsv([]).replace(CSV_BOM, "")).toBe("날짜,종목,세트 번호,횟수\r\n");
  });

  it("기록을 한 줄씩, 완료 시각 순서(같으면 세트 번호 순서)로 적는다", () => {
    const csv = buildCsv([
      rec("b", 2, 9, "2026-11-20T18:05:00+09:00"),
      rec("a", 1, 12, "2026-11-03T07:00:00+09:00", "bench-press"),
      rec("b", 1, 10, "2026-11-20T18:00:00+09:00"),
    ]);
    expect(csv.replace(CSV_BOM, "").split("\r\n")).toEqual([
      "날짜,종목,세트 번호,횟수",
      "2026-11-03,벤치프레스,1,12",
      "2026-11-20,스쿼트,1,10",
      "2026-11-20,스쿼트,2,9",
      "",
    ]);
  });

  it("날짜는 한국 시간 기준 (UTC 15:00 = 다음 날 00:00 KST)", () => {
    const csv = buildCsv([rec("a", 1, 10, "2026-11-22T15:00:00Z")]);
    expect(csv).toContain("2026-11-23,스쿼트,1,10");
  });

  it("원본 기록의 순서를 바꾸지 않는다", () => {
    const input = [rec("b", 1, 5, "2026-11-20T10:00:00+09:00"), rec("a", 1, 5, "2026-11-01T10:00:00+09:00")];
    buildCsv(input);
    expect(input[0].workoutId).toBe("b");
  });
});

describe("csvFileName", () => {
  it("한국 날짜로 파일 이름을 만든다", () => {
    expect(csvFileName(new Date("2026-11-22T15:00:00Z"))).toBe("운동기록_2026-11-23.csv");
  });
});
