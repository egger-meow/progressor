import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      // Relative to prisma/schema.prisma, not the repo root — resolves to
      // prisma/test.db. See vitest.global-setup.ts for why.
      DATABASE_URL: "file:./test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
