import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest 설정 — 단위/round-trip/스냅샷 테스트.
 * tsconfig 의 `@/*` 경로 별칭을 테스트에서도 동일하게 해석한다.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
