-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "anchor" TEXT,
    "timeOfDayPreference" TEXT,
    "preferredStartTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routine" ("anchor", "cadence", "category", "createdAt", "id", "preferredStartTime", "timeOfDayPreference", "title", "updatedAt") SELECT "anchor", "cadence", "category", "createdAt", "id", "preferredStartTime", "timeOfDayPreference", "title", "updatedAt" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
