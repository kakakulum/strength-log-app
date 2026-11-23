import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 계산 로직(src/lib)만 테스트하므로 화면 환경 없이 node에서 실행한다.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
