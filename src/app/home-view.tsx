"use client";

// Design Ref: §1 홈 — [운동 시작], [기록·추세] 두 버튼과 기록이 없을 때의 안내 문구
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { backupFileName, buildBackup } from "@/lib/backup";
import { buildCsv, csvFileName } from "@/lib/csv";
import { backupReminderDays } from "@/lib/backup-reminder";
import { getExerciseName } from "@/lib/exercises";
import { getWeekWorkouts, type WeekExercise } from "@/lib/week";
import { SETS_CHANGE_EVENT, loadLastBackupAt, loadSets, saveLastBackupAt } from "@/lib/storage";
import RestorePanel from "./restore-panel";

// 저장소는 다른 탭에서 바뀔 수 있으므로 storage 이벤트를 구독한다.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SETS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SETS_CHANGE_EVENT, onChange);
  };
}

// 읽기에 실패했음을 나타내는 값. (실패를 0건으로 보이게 하면 기록이 사라진 것처럼 오해한다.)
const READ_FAILED = -1;

// 저장된 세트 수(숫자)를 스냅샷으로 쓴다. 읽기에 실패하면 READ_FAILED.
function getSnapshot(): number {
  const result = loadSets();
  return result.ok ? result.value.length : READ_FAILED;
}

// 서버 렌더링 중에는 저장소를 알 수 없으므로 null(아직 모름)로 둔다.
function getServerSnapshot(): number | null {
  return null;
}

// 백업 알림에 보여줄 "마지막 백업 후 지난 일수". 알릴 필요가 없거나 읽지 못하면 0.
function getReminderSnapshot(): number {
  const result = loadSets();
  return result.ok ? backupReminderDays(result.value, loadLastBackupAt()) : 0;
}

function getReminderServerSnapshot(): number {
  return 0;
}

// 이번 주 요약(종목별 세트별 횟수)을 JSON 문자열로 스냅샷에 쓴다. 기록이 없거나 읽지 못하면 빈 문자열.
// (문자열이라 값이 같으면 같은 스냅샷으로 취급되어 화면이 불필요하게 다시 그려지지 않는다.)
function getSummarySnapshot(): string {
  const result = loadSets();
  if (!result.ok || result.value.length === 0) return "";
  return JSON.stringify(getWeekWorkouts(result.value));
}

function getSummaryServerSnapshot(): string {
  return "";
}

// Design Ref: §6 CSV 내보내기(nice) — 전체 기록을 엑셀에서 열 수 있는 CSV 파일로 저장한다.
// 기록은 서버로 보내지 않고 이 브라우저 안에서 파일로 만든다.
function downloadFile(content: string, type: string, fileName: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const loaded = loadSets();
  if (!loaded.ok) return;
  downloadFile(buildCsv(loaded.value), "text/csv;charset=utf-8", csvFileName());
}

// 백업(JSON): 나중에 복원할 수 있는 파일. CSV와 별개다.
function exportBackup() {
  const loaded = loadSets();
  if (!loaded.ok) return;
  downloadFile(buildBackup(loaded.value), "application/json", backupFileName());
  saveLastBackupAt(); // 백업 알림의 기준 시각
}

/** 이번 주 요약: 종목마다 한 줄, 운동이 여러 번이면 `/`로 나눈다. 이번 주 운동이 없으면 안내 한 줄. */
function WeekSummary({ items }: { items: WeekExercise[] }) {
  if (items.length === 0) {
    return <p className="text-center text-zinc-500">이번 주는 아직 운동하지 않았습니다</p>;
  }
  return (
    <section aria-label="이번 주 운동" className="flex flex-col gap-1.5 rounded-2xl border border-zinc-300 px-4 py-3 dark:border-zinc-700">
      <h2 className="text-sm font-semibold text-zinc-500">이번 주</h2>
      {items.map((it) => (
        <p key={it.exerciseId} className="flex items-baseline justify-between gap-3 tabular-nums">
          <span className="font-semibold">{getExerciseName(it.exerciseId) ?? it.exerciseId}</span>
          <span className="text-right">{it.workouts.map((w) => w.join("·")).join(" / ")}회</span>
        </p>
      ))}
    </section>
  );
}

export default function HomeView() {
  const setCount = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reminderDays = useSyncExternalStore(subscribe, getReminderSnapshot, getReminderServerSnapshot);
  const weekSummary = useSyncExternalStore(subscribe, getSummarySnapshot, getSummaryServerSnapshot);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-center text-2xl font-bold">근력운동 기록</h1>

      {/* 기록이 있을 때만: 이번 주(월요일 00:00~)에 한 종목마다 세트별 횟수. 예) 푸시업 3·3·3·3회 */}
      {weekSummary !== "" && <WeekSummary items={JSON.parse(weekSummary) as WeekExercise[]} />}

      <div className="flex flex-col gap-4">
        <Link
          href="/workout/setup"
          className="rounded-2xl bg-foreground px-6 py-6 text-center text-xl font-semibold text-background active:opacity-80"
        >
          운동 시작
        </Link>
        <Link
          href="/history"
          className="rounded-2xl border-2 border-foreground px-6 py-6 text-center text-xl font-semibold active:opacity-80"
        >
          기록·추세
        </Link>
      </div>

      {/* 저장소를 읽은 뒤(null이 아닐 때) 기록이 0건이면 안내 문구를, 읽기에 실패했으면 오류 문구를 보여준다 */}
      {setCount === 0 && (
        <p className="text-center text-zinc-500">아직 운동 기록이 없습니다</p>
      )}
      {setCount === READ_FAILED && (
        <p role="alert" className="text-center text-red-500">
          기록을 읽지 못했습니다. 브라우저 저장소를 사용할 수 없는 상태일 수 있습니다.
        </p>
      )}

      {/* 기록이 이 브라우저에만 있으므로, 오래 백업하지 않았으면 한 줄로 알린다 (백업하면 사라진다) */}
      {reminderDays > 0 && (
        <p role="status" className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm dark:bg-zinc-800">
          마지막 백업 후 {reminderDays}일이 지났습니다. 기록은 이 브라우저에만 있으니 [백업 (JSON)]으로 저장해 두세요.
        </p>
      )}

      {/* 내보낼 기록이 있을 때만 작은 내보내기·백업 버튼을 보여준다 (필수 버튼 두 개는 그대로) */}
      {setCount !== null && setCount > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={exportCsv} className="text-sm text-zinc-500 underline">
            내보내기 (CSV)
          </button>
          <button type="button" onClick={exportBackup} className="text-sm text-zinc-500 underline">
            백업 (JSON)
          </button>
        </div>
      )}
      {setCount !== null && setCount !== READ_FAILED && <RestorePanel />}
    </main>
  );
}
