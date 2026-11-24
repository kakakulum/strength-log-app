// 백업 알림 규칙: 기록은 이 브라우저에만 있으므로, 오래 백업하지 않았으면 홈에서 한 줄로 알려준다.
// 화면과 분리해 두어 경계 날짜를 테스트할 수 있다.
import type { SetRecord } from "./types";

/** 마지막 백업(또는 첫 기록) 후 이 일수가 지나면 알린다 */
export const REMIND_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 백업을 권할 때 "마지막 백업 후 지난 일수"를, 알릴 필요가 없으면 0을 돌려준다.
 * - 기록이 없으면 알리지 않는다.
 * - 백업한 적이 없으면 가장 오래된 기록을 기준으로 센다. (첫 사용 직후에는 알리지 않는다)
 * - 마지막 백업 뒤에 새로 완료한 세트가 없으면 알리지 않는다. (이미 백업된 상태)
 */
export function backupReminderDays(
  sets: SetRecord[],
  lastBackupAt: string | null,
  now: Date = new Date(),
): number {
  if (sets.length === 0) return 0;

  const times = sets.map((s) => Date.parse(s.completedAt)).filter((t) => Number.isFinite(t));
  if (times.length === 0) return 0;
  const earliest = Math.min(...times);
  const latest = Math.max(...times);

  const backedUp = lastBackupAt === null ? NaN : Date.parse(lastBackupAt);
  const hasBackup = Number.isFinite(backedUp);

  if (hasBackup && latest <= backedUp) return 0;

  const days = Math.floor((now.getTime() - (hasBackup ? backedUp : earliest)) / DAY_MS);
  return days >= REMIND_AFTER_DAYS ? days : 0;
}
