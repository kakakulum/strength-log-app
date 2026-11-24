// 백업 알림 규칙 테스트: 알리는 조건과 알리지 않는 조건의 경계
import { describe, expect, it } from "vitest";
import { REMIND_AFTER_DAYS, backupReminderDays } from "./backup-reminder";
import type { SetRecord } from "./types";

const NOW = new Date("2026-12-01T12:00:00+09:00");

function rec(completedAt: string, setNo = 1): SetRecord {
  return { workoutId: `w-${completedAt}`, setNo, exerciseId: "squat", reps: 10, completedAt };
}

describe("백업 알림", () => {
  it("기록이 없으면 알리지 않는다", () => {
    expect(backupReminderDays([], null, NOW)).toBe(0);
  });

  it("백업한 적 없고 첫 기록이 14일 전이면 알린다 (13일은 알리지 않는다)", () => {
    expect(backupReminderDays([rec("2026-11-17T12:00:00+09:00")], null, NOW)).toBe(REMIND_AFTER_DAYS);
    expect(backupReminderDays([rec("2026-11-18T12:00:00+09:00")], null, NOW)).toBe(0);
  });

  it("첫 사용 직후(오늘 기록)에는 알리지 않는다", () => {
    expect(backupReminderDays([rec("2026-12-01T09:00:00+09:00")], null, NOW)).toBe(0);
  });

  it("백업 뒤 새 기록이 있고 14일이 지났으면 지난 일수를 알려준다", () => {
    const sets = [rec("2026-10-01T10:00:00+09:00"), rec("2026-11-20T10:00:00+09:00")];
    expect(backupReminderDays(sets, "2026-11-10T03:00:00.000Z", NOW)).toBe(21);
  });

  it("백업 뒤 새 기록이 없으면 오래됐어도 알리지 않는다", () => {
    const sets = [rec("2026-10-01T10:00:00+09:00")];
    expect(backupReminderDays(sets, "2026-10-05T03:00:00.000Z", NOW)).toBe(0);
  });

  it("백업 뒤 새 기록이 있어도 14일이 안 지났으면 알리지 않는다", () => {
    const sets = [rec("2026-11-25T10:00:00+09:00")];
    expect(backupReminderDays(sets, "2026-11-20T03:00:00.000Z", NOW)).toBe(0);
  });

  it("백업 시각이 깨져 있으면 백업한 적 없는 것으로 본다", () => {
    expect(backupReminderDays([rec("2026-11-10T12:00:00+09:00")], "엉터리", NOW)).toBe(21);
  });
});
