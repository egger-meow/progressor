import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./vitest.global-setup.ts"],
    // All test files share one SQLite file (prisma/test.db) and freely
    // deleteMany() their own tables in afterEach; running files in
    // parallel workers races those cleanups against other files' still-
    // running assertions. Sequential execution trades a bit of wall-clock
    // time for correctness — fine at this test count.
    fileParallelism: false,
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
