import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 노드 환경에서 실행 (브라우저 X)
    environment: "node",
    // 테스트 파일 패턴: *.test.ts
    include: ["**/*.test.ts"],
  },
});
