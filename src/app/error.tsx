"use client";

// 화면을 그리다 예상하지 못한 오류가 나도 빈 화면으로 멈추지 않고 안내와 홈으로 가는 길을 보여준다.
// (기록은 지우지 않는다. 문제가 계속되면 백업 파일로 복원하거나 사이트 데이터를 지워야 한다.)
import Link from "next/link";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10 text-center">
      <h1 className="text-2xl font-bold">문제가 생겼습니다</h1>
      <p role="alert" className="text-zinc-500">
        화면을 표시하는 중 오류가 났습니다. 저장된 기록은 지워지지 않았습니다.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-2xl bg-foreground px-6 py-4 text-lg font-semibold text-background"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-2xl border-2 border-zinc-400 px-6 py-4 text-lg font-semibold"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
