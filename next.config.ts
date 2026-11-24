import type { NextConfig } from "next";

// 보안 헤더: 다른 사이트가 이 앱을 iframe에 넣는 것, 형식 추측, 불필요한 권한을 막는다.
// script-src는 Next가 쓰는 인라인 스크립트와 맞추려면 nonce가 필요해 아직 넣지 않았다.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // 서비스 워커 파일은 브라우저가 항상 새로 확인하게 한다. (고쳐도 예전 것이 남지 않게)
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
