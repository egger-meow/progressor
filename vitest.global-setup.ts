import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

// Runs once before the whole test run, against a database file dedicated to
// tests (never prisma/dev.db) so `npm test` can't corrupt local dev data.
//
// Prisma resolves a sqlite `file:` URL relative to schema.prisma's directory
// (prisma/), not the process cwd — so this must be "./test.db", not
// "./prisma/test.db", or it lands at prisma/prisma/test.db instead of
// prisma/test.db.
const TEST_DB_PATH = "prisma/test.db";
const TEST_DATABASE_URL = "file:./test.db";

function removeTestDb() {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
}

export default function setup() {
  removeTestDb();

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });

  return removeTestDb;
}
