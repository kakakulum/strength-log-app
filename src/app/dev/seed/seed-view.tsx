"use client";

// Design Ref: §6 — 개발·시연용 가상 기록 넣기. 홈에서 링크하지 않는 숨은 페이지다.
// 이 브라우저의 localStorage에만 쓰며 서버로 보내지 않는다. 실제 기록과 섞이지 않게 별도 브라우저에서 쓴다.
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { EXERCISES } from "@/lib/exercises";
import { createSeedData } from "@/lib/seed";
import { loadSets } from "@/lib/storage";

// "오늘"에 따라 달라지는 값이라 서버에서 미리 그리지 않고, 브라우저에 붙은 뒤에만 그린다.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

export default function SeedView() {
  return useIsClient() ? <SeedContent /> : null;
}

function SeedContent() {
  const [message, setMessage] = useState<string | null>(null);
  const [needConfirm, setNeedConfirm] = useState<number | null>(null);
  // 정답표는 화면을 연 시점의 "오늘" 기준으로 한 번만 만든다.
  const [seed] = useState(() => createSeedData(new Date()));

  function handleSeed() {
    const existing = loadSets();
    const existingCount = existing.ok ? existing.value.length : 0;
    // 기존 기록이 있으면 덮어쓰기 전에 한 번 더 확인한다.
    if (existingCount > 0 && needConfirm === null) {
      setNeedConfirm(existingCount);
      setMessage(null);
      return;
    }
    try {
      window.localStorage.setItem("sets", JSON.stringify(seed.records));
      setNeedConfirm(null);
      setMessage(`가상 기록 ${seed.records.length}건을 넣었습니다.`);
    } catch {
      setMessage("기록을 넣지 못했습니다. 브라우저 저장소를 확인해 주세요.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">가상 기록 넣기</h1>
        <Link href="/" className="text-sm text-zinc-500 underline">
          홈으로
        </Link>
      </div>

      <p className="text-sm text-zinc-500">
        검증·시연용입니다. 이 브라우저의 기록을 가상 기록으로 바꿉니다. 실제 운동 기록이 있는
        브라우저에서는 쓰지 마세요.
      </p>

      {needConfirm !== null && (
        <p role="alert" className="rounded-xl border-2 border-red-500 p-3 text-red-500">
          이 브라우저에 기록 {needConfirm}건이 있습니다. 계속하면 모두 가상 기록으로 바뀝니다.
          그래도 넣으려면 아래 버튼을 한 번 더 누르세요.
        </p>
      )}

      <button
        type="button"
        onClick={handleSeed}
        className="rounded-2xl bg-foreground px-6 py-5 text-xl font-semibold text-background"
      >
        {needConfirm !== null ? "덮어쓰고 가상 기록 넣기" : "가상 기록 넣기"}
      </button>

      {message && (
        <p role="status" className="text-center font-semibold">
          {message}
        </p>
      )}

      <section aria-label="정답표" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-500">주간 정답표 (이 값이 보여야 정상)</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {EXERCISES.map((e) => {
            const w = seed.weekly[e.id];
            return (
              <li key={e.id} className="flex justify-between rounded-lg bg-zinc-500/10 px-3 py-2">
                <span>{e.name}</span>
                <span>
                  이번 주 {w.thisWeekCount}세트 · 지난주 {w.lastWeekLabel} · {w.changeLabel}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
