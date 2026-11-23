import { notFound } from "next/navigation";
import SeedView from "./seed-view";

export default function SeedPage() {
  // 검증·시연용 페이지라 운영(production) 배포에서는 열지 않는다. (Preview와 로컬에서는 열린다.)
  if (process.env.VERCEL_ENV === "production") notFound();
  return <SeedView />;
}
