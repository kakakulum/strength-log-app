import { describe, expect, it } from "vitest";
import { getMascotProgress } from "./mascot";

describe("운동 친구 성장", () => {
  it("같은 한국 날짜의 여러 세트를 하루로 센다", () => {
    const result = getMascotProgress([
      { completedAt: "2026-11-23T14:59:59Z" },
      { completedAt: "2026-11-23T15:00:00Z" },
      { completedAt: "2026-11-24T18:00:00+09:00" },
      { completedAt: "잘못된 시각" },
    ]);
    expect(result.days).toBe(2);
  });

  it.each([
    [0, "sleeping", 3],
    [1, "sleeping", 3],
    [2, "sleeping", 3],
    [3, "stretching", 7],
    [6, "stretching", 7],
    [7, "lifting", null],
    [8, "lifting", null],
  ])("누적 %i일에 해당하는 모습을 보여준다", (days, stage, nextMilestone) => {
    const sets = Array.from({ length: days }, (_, i) => ({
      completedAt: `2026-11-${10 + i * 2}T10:00:00+09:00`,
    }));
    expect(getMascotProgress(sets)).toEqual({ days, stage, nextMilestone });
  });
});
