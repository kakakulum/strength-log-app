import { getMascotProgress } from "@/lib/mascot";
import type { SetRecord } from "@/lib/types";

type MascotStage = ReturnType<typeof getMascotProgress>["stage"];

const stageNames: Record<MascotStage, string> = {
  sleeping: "잠든 새싹",
  stretching: "기지개 켜는 새싹",
  lifting: "덤벨을 든 새싹",
};

function Sprout({ stage }: { stage: MascotStage }) {
  const sleeping = stage === "sleeping";
  const eye = sleeping
    ? "top-1 h-1.5 w-2 rounded-b-full border-b-2 border-emerald-950"
    : "h-2.5 w-1.5 rounded-full bg-emerald-950";

  return (
    <div aria-hidden="true" className="relative h-20 w-23 shrink-0">
      <span className="absolute right-4 bottom-1 left-4 h-2 rounded-[50%] bg-emerald-900/15 dark:bg-emerald-400/15" />
      {stage === "stretching" && (
        <>
          <span className="absolute bottom-7 left-1 h-7 w-3 -rotate-40 rounded-full bg-emerald-500" />
          <span className="absolute right-1 bottom-7 h-7 w-3 rotate-40 rounded-full bg-emerald-500" />
        </>
      )}
      <span className={`absolute left-[47%] h-4 w-5 -rotate-20 rounded-tl-full rounded-br-full bg-emerald-500 dark:bg-emerald-400 ${sleeping ? "top-4" : "top-1"}`} />
      <span className={`absolute right-[49%] h-3 w-4 rotate-15 rounded-tr-full rounded-bl-full bg-emerald-600 dark:bg-emerald-500 ${sleeping ? "top-5.5" : "top-2.5"}`} />
      <span className={`absolute right-3 bottom-3 left-3 rounded-[45%_45%_38%_38%] border-2 border-emerald-500 bg-linear-to-b from-lime-200 to-emerald-400 shadow-sm ${
        sleeping ? "h-9" : "h-12"
      }`}>
        <span className="absolute top-1/2 left-1/2 flex h-3 -translate-x-1/2 -translate-y-1/2 items-start gap-3.5">
          <span className={`relative ${eye}`} />
          <span className={`relative ${eye}`} />
        </span>
        <span className="absolute bottom-1.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-b-full border-b-2 border-emerald-950" />
      </span>
      {sleeping && (
        <span className="absolute top-3 right-0 -rotate-12 text-sm font-bold text-emerald-700 dark:text-emerald-300">zᶻ</span>
      )}
      {stage === "lifting" && (
        <span className="absolute right-0 bottom-4 flex h-6 rotate-[-18deg] items-center">
          <span className="h-5 w-2 rounded-sm bg-indigo-900 ring-1 ring-indigo-300 dark:bg-indigo-300 dark:ring-indigo-600" />
          <span className="h-1.5 w-3 bg-indigo-700 dark:bg-indigo-400" />
          <span className="h-5 w-2 rounded-sm bg-indigo-900 ring-1 ring-indigo-300 dark:bg-indigo-300 dark:ring-indigo-600" />
        </span>
      )}
    </div>
  );
}

export default function WorkoutMascot({ sets }: { sets: SetRecord[] }) {
  const { days, stage, nextMilestone } = getMascotProgress(sets);

  return (
    <section aria-labelledby="workout-mascot-title" className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-lime-50 p-4 dark:border-emerald-900 dark:from-emerald-950/75 dark:to-zinc-950">
      <div className="flex items-center gap-3.5">
        <Sprout stage={stage} />
        <div className="min-w-0 flex-1">
          <h2 id="workout-mascot-title" className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">내 운동 친구</h2>
          <p className="mt-0.5 text-base font-bold tracking-tight">{stageNames[stage]}</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            운동한 날 <strong className="font-semibold tabular-nums">{days}일</strong>
          </p>
        </div>
      </div>
      {nextMilestone === null ? (
        <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">마지막 모습에 도달했어요.</p>
      ) : (
        <>
          <progress
            aria-label="다음 모습까지의 진행도"
            value={days}
            max={nextMilestone}
            className="mt-1 block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-emerald-200/70 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-600 [&::-webkit-progress-bar]:bg-emerald-200/70 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-600 dark:bg-emerald-900 dark:[&::-webkit-progress-bar]:bg-emerald-900"
          />
          <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">다음 모습까지 {nextMilestone - days}일</p>
        </>
      )}
    </section>
  );
}
