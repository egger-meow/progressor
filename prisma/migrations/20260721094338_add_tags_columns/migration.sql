-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeadlineTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DeadlineTask" ("createdAt", "dueAt", "estimatedDays", "id", "title", "updatedAt") SELECT "createdAt", "dueAt", "estimatedDays", "id", "title", "updatedAt" FROM "DeadlineTask";
DROP TABLE "DeadlineTask";
ALTER TABLE "new_DeadlineTask" RENAME TO "DeadlineTask";
CREATE TABLE "new_FixedCommitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "ignoreSemesterBounds" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FixedCommitment" ("createdAt", "dayOfWeek", "endTime", "id", "ignoreSemesterBounds", "startTime", "title", "updatedAt") SELECT "createdAt", "dayOfWeek", "endTime", "id", "ignoreSemesterBounds", "startTime", "title", "updatedAt" FROM "FixedCommitment";
DROP TABLE "FixedCommitment";
ALTER TABLE "new_FixedCommitment" RENAME TO "FixedCommitment";
CREATE TABLE "new_Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "anchor" TEXT,
    "timeOfDayPreference" TEXT,
    "preferredStartTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routine" ("anchor", "cadence", "category", "createdAt", "durationMinutes", "id", "preferredStartTime", "timeOfDayPreference", "title", "updatedAt") SELECT "anchor", "cadence", "category", "createdAt", "durationMinutes", "id", "preferredStartTime", "timeOfDayPreference", "title", "updatedAt" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
CREATE TABLE "new_TrackableItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "unitCount" INTEGER NOT NULL,
    "unitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "estimatedDays" INTEGER NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TrackableItem" ("createdAt", "estimatedDays", "id", "priority", "status", "title", "type", "unitCount", "unitsCompleted", "updatedAt") SELECT "createdAt", "estimatedDays", "id", "priority", "status", "title", "type", "unitCount", "unitsCompleted", "updatedAt" FROM "TrackableItem";
DROP TABLE "TrackableItem";
ALTER TABLE "new_TrackableItem" RENAME TO "TrackableItem";
CREATE INDEX "TrackableItem_type_status_idx" ON "TrackableItem"("type", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
