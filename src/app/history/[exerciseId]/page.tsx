import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EXERCISES, isExerciseId } from "@/lib/exercises";
import WeeklyView from "./weekly-view";

// 고정 종목 6개의 주소를 미리 만들어 둔다.
export function generateStaticParams() {
  return EXERCISES.map((e) => ({ exerciseId: e.id }));
}

// params(주소 값)는 await 하지 않고 Suspense 안의 하위 컴포넌트에서 읽는다.
// (Next.js 권장 방식: 주소 데이터를 Suspense 밖에서 읽으면 즉시 이동을 막는다.)
async function ExerciseContent({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  // 목록에 없는 종목 주소는 404로 처리한다.
  if (!isExerciseId(exerciseId)) notFound();
  return <WeeklyView exerciseId={exerciseId} />;
}

export default function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ExerciseContent params={params} />
    </Suspense>
  );
}
