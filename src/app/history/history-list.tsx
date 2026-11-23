"use client";

// Design Ref: §1 기록·추세 — 종목 5개 목록(탭 1). 앱 전체에 기록이 없으면 안내 문구.
import Link from "next/link";
import { EXERCISES } from "@/lib/exercises";
import { useSets } from "@/lib/use-sets";

export default function HistoryList() {
  const sets = useSets();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기록·추세</h1>
        <Link href="/" className="text-sm text-zinc-500 underline">
          홈으로
        </Link>
      </div>

      {sets === null ? null : sets.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">아직 운동 기록이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {EXERCISES.map((e) => (
            <li key={e.id}>
              <Link
                href={`/history/${e.id}`}
                className="block rounded-2xl border-2 border-foreground px-6 py-5 text-center text-xl font-semibold active:opacity-80"
              >
                {e.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
