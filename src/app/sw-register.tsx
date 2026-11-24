"use client";

// 서비스 워커 등록: 운영 배포에서만 등록한다. (개발 중에는 화면이 예전 것으로 보이는 일을 막는다)
// 지원하지 않거나 등록에 실패해도 앱은 평소처럼 동작한다.
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
