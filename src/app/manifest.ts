// 홈 화면에 추가할 때 쓰는 앱 정보: 이름, 아이콘, 주소창 없는 전체 화면 실행
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "근력운동 기록",
    short_name: "운동 기록",
    description: "세트 완료 한 번으로 기록하고 휴식 타이머를 자동으로 시작하는 근력운동 기록 앱",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181b",
    theme_color: "#18181b",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
