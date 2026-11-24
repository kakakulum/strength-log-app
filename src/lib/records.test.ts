// 최고 기록 테스트: 최고 기록 계산과 "새 최고 기록" 판정의 경계
import { describe, expect, it } from "vitest";
import { getBestRecord, isNewBest, newBestOfWorkout } from "./records";
import type { SetRecord } from "./types";
import type { ExerciseId } from "./exercises";

function rec(workoutId: string, setNo: number, reps: number, completedAt: string, exerciseId: ExerciseId = "squat"): SetRecord {
  return { workoutId, setNo, exerciseId, reps, completedAt };
}

describe("최고 기록", () => {
  it("기록이 없으면 null이다 (다른 종목 기록은 세지 않는다)", () => {
    expect(getBestRecord([], "squat")).toBeNull();
    expect(getBestRecord([rec("w1", 1, 20, "2026-11-01T10:00:00+09:00", "bench-press")], "squat")).toBeNull();
  });

  it("한 세트의 가장 큰 횟수와 그 날짜를 돌려준다", () => {
    const sets = [
      rec("w1", 1, 10, "2026-11-01T10:00:00+09:00"),
      rec("w1", 2, 15, "2026-11-01T10:05:00+09:00"),
      rec("w2", 1, 12, "2026-11-10T10:00:00+09:00"),
    ];
    expect(getBestRecord(sets, "squat")).toEqual({ reps: 15, date: "2026-11-01" });
  });

  it("같은 횟수가 여러 번이면 가장 최근 날짜를 보여준다", () => {
    const sets = [rec("w1", 1, 15, "2026-11-01T10:00:00+09:00"), rec("w2", 1, 15, "2026-11-10T10:00:00+09:00")];
    expect(getBestRecord(sets, "squat")).toEqual({ reps: 15, date: "2026-11-10" });
  });
});

describe("새 최고 기록 판정 (세트 하나)", () => {
  const before = [rec("w1", 1, 10, "2026-11-01T10:00:00+09:00"), rec("w1", 2, 9, "2026-11-01T10:05:00+09:00")];

  it("이전 최고보다 많으면 새 최고 기록이다", () => {
    const now = rec("w2", 1, 11, "2026-11-10T10:00:00+09:00");
    expect(isNewBest([...before, now], now)).toBe(true);
  });

  it("같은 횟수나 적은 횟수는 새 최고 기록이 아니다", () => {
    const same = rec("w2", 1, 10, "2026-11-10T10:00:00+09:00");
    expect(isNewBest([...before, same], same)).toBe(false);
    const less = rec("w2", 2, 8, "2026-11-10T10:05:00+09:00");
    expect(isNewBest([...before, less], less)).toBe(false);
  });

  it("그 종목의 첫 기록은 축하하지 않는다", () => {
    const first = rec("w1", 1, 30, "2026-11-01T10:00:00+09:00");
    expect(isNewBest([first], first)).toBe(false);
  });

  it("다른 종목의 기록과는 비교하지 않는다", () => {
    const other = rec("w1", 1, 30, "2026-11-01T10:00:00+09:00", "bench-press");
    const now = rec("w2", 1, 5, "2026-11-10T10:00:00+09:00", "squat");
    expect(isNewBest([other, now], now)).toBe(false);
    const sq = rec("w0", 1, 3, "2026-10-30T10:00:00+09:00", "squat");
    expect(isNewBest([other, sq, now], now)).toBe(true);
  });

  it("같은 운동 안에서 앞 세트도 이전 기록으로 센다 (12회 다음 13회는 다시 새 기록)", () => {
    const s1 = rec("w2", 1, 12, "2026-11-10T10:00:00+09:00");
    const s2 = rec("w2", 2, 13, "2026-11-10T10:05:00+09:00");
    const s3 = rec("w2", 3, 13, "2026-11-10T10:10:00+09:00");
    const all = [...before, s1, s2, s3];
    expect(isNewBest(all, s1)).toBe(true);
    expect(isNewBest(all, s2)).toBe(true);
    expect(isNewBest(all, s3)).toBe(false);
  });

  it("나중에 한 기록은 이전 기록으로 세지 않는다", () => {
    const old = rec("w1", 1, 8, "2026-11-01T10:00:00+09:00");
    const later = rec("w2", 1, 20, "2026-11-10T10:00:00+09:00");
    expect(isNewBest([old, later], old)).toBe(false);
  });
});

describe("운동 결과의 새 최고 기록", () => {
  const prev = [rec("w1", 1, 10, "2026-11-01T10:00:00+09:00"), rec("w1", 2, 9, "2026-11-01T10:05:00+09:00")];

  it("그 운동의 최고 세트가 이전 최고를 넘으면 그 횟수를 돌려준다", () => {
    const w2 = [rec("w2", 1, 10, "2026-11-10T10:00:00+09:00"), rec("w2", 2, 12, "2026-11-10T10:05:00+09:00")];
    expect(newBestOfWorkout([...prev, ...w2], "w2")).toBe(12);
  });

  it("넘지 못했거나 첫 운동이면 null이다", () => {
    const w2 = [rec("w2", 1, 10, "2026-11-10T10:00:00+09:00")];
    expect(newBestOfWorkout([...prev, ...w2], "w2")).toBeNull();
    expect(newBestOfWorkout(prev, "w1")).toBeNull();
    expect(newBestOfWorkout(prev, "없는운동")).toBeNull();
  });
});
