import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" を読み込むモジュール（recaptcha・x-client・runtime-config）をテストで読み込めるようにする
      "server-only": path.resolve(__dirname, "src/__tests__/helpers/server-only.ts"),
    },
  },
});
