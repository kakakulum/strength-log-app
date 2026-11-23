"use client";

// Design Ref: §1 홈 — [운동 시작], [기록·추세] 두 버튼과 기록이 없을 때의 안내 문구
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buildCsv, csvFileName } from "@/lib/csv";
import { loadSets } from "@/lib/storage";

// 저장소는 다른 탭에서 바뀔 수 있으므로 storage 이벤트를 구독한다.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
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

// Design Ref: §6 CSV 내보내기(nice) — 전체 기록을 엑셀에서 열 수 있는 CSV 파일로 저장한다.
// 기록은 서버로 보내지 않고 이 브라우저 안에서 파일로 만든다.
function exportCsv() {
  const loaded = loadSets();
  if (!loaded.ok) return;
  const blob = new Blob([buildCsv(loaded.value)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function HomeView() {
  const setCount = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-center text-2xl font-bold">근력운동 기록</h1>

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

      {/* 내보낼 기록이 있을 때만 작은 [내보내기]를 보여준다 (필수 버튼 두 개는 그대로) */}
      {setCount !== null && setCount > 0 && (
        <button
          type="button"
          onClick={exportCsv}
          className="self-center text-sm text-zinc-500 underline"
        >
          내보내기 (CSV)
        </button>
      )}
    </main>
  );
}
