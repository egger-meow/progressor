-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CategoryItemSchedule" (
    "type" TEXT NOT NULL PRIMARY KEY,
    "cadence" TEXT NOT NULL,
    "anchor" TEXT,
    "timeOfDayPreferences" TEXT NOT NULL DEFAULT '[]',
    "preferredStartTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CategoryItemSchedule" ("type", "cadence", "anchor", "timeOfDayPreferences", "preferredStartTime", "durationMinutes", "createdAt", "updatedAt")
SELECT "type", "cadence", "anchor",
  CASE WHEN "timeOfDayPreference" IS NULL THEN '[]' ELSE '["' || "timeOfDayPreference" || '"]' END,
  "preferredStartTime", "durationMinutes", "createdAt", "updatedAt"
FROM "CategoryItemSchedule";
DROP TABLE "CategoryItemSchedule";
ALTER TABLE "new_CategoryItemSchedule" RENAME TO "CategoryItemSchedule";
CREATE TABLE "new_Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "anchor" TEXT,
    "timeOfDayPreferences" TEXT NOT NULL DEFAULT '[]',
    "preferredStartTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routine" ("id", "title", "category", "cadence", "anchor", "timeOfDayPreferences", "preferredStartTime", "durationMinutes", "tags", "createdAt", "updatedAt")
SELECT "id", "title", "category", "cadence", "anchor",
  CASE WHEN "timeOfDayPreference" IS NULL THEN '[]' ELSE '["' || "timeOfDayPreference" || '"]' END,
  "preferredStartTime", "durationMinutes", "tags", "createdAt", "updatedAt"
FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
