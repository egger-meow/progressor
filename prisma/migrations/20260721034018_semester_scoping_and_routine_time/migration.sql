-- AlterTable
ALTER TABLE "Routine" ADD COLUMN "preferredStartTime" TEXT;

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "startDate" DATETIME NOT NULL,
    "weekCount" INTEGER NOT NULL DEFAULT 16,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FixedCommitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "ignoreSemesterBounds" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FixedCommitment" ("createdAt", "dayOfWeek", "endTime", "id", "startTime", "title", "updatedAt") SELECT "createdAt", "dayOfWeek", "endTime", "id", "startTime", "title", "updatedAt" FROM "FixedCommitment";
DROP TABLE "FixedCommitment";
ALTER TABLE "new_FixedCommitment" RENAME TO "FixedCommitment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
