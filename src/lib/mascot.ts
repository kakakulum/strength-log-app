import { kstDateKey } from "./trend";
import type { SetRecord } from "./types";

/** 저장된 세트가 하나라도 있는 한국 날짜를 각각 하루로 센다. */
export function getMascotProgress(sets: Pick<SetRecord, "completedAt">[]) {
  const dates = new Set<string>();
  for (const { completedAt } of sets) {
    const completed = new Date(completedAt);
    if (Number.isFinite(completed.getTime())) dates.add(kstDateKey(completed));
  }

  const days = dates.size;
  if (days >= 7) return { days, stage: "lifting", nextMilestone: null } as const;
  if (days >= 3) return { days, stage: "stretching", nextMilestone: 7 } as const;
  return { days, stage: "sleeping", nextMilestone: 3 } as const;
}
