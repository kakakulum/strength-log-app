import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "./sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "근력운동 기록",
  description: "세트 완료 한 번으로 기록하고 휴식 타이머를 자동으로 시작하는 근력운동 기록 앱",
  // 홈 화면에 추가했을 때(특히 iOS) 쓰는 아이콘과 이름
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "운동 기록", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
