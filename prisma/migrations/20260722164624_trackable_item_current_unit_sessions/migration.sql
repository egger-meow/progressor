-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrackableItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "unitCount" INTEGER NOT NULL,
    "unitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "estimatedDays" INTEGER NOT NULL,
    "targetDate" DATETIME,
    "unitWeightMultiplier" REAL NOT NULL DEFAULT 1.0,
    "currentUnitSessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TrackableItem" ("createdAt", "estimatedDays", "id", "priority", "status", "tags", "targetDate", "title", "type", "unitCount", "unitWeightMultiplier", "unitsCompleted", "updatedAt") SELECT "createdAt", "estimatedDays", "id", "priority", "status", "tags", "targetDate", "title", "type", "unitCount", "unitWeightMultiplier", "unitsCompleted", "updatedAt" FROM "TrackableItem";
DROP TABLE "TrackableItem";
ALTER TABLE "new_TrackableItem" RENAME TO "TrackableItem";
CREATE INDEX "TrackableItem_type_status_idx" ON "TrackableItem"("type", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
