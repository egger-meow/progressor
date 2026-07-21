/*
  Warnings:

  - You are about to drop the column `estimatedDays` on the `DeadlineTask` table. All the data in the column will be lost.
  - Added the required column `estimatedHours` to the `DeadlineTask` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeadlineTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "estimatedHours" REAL NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DeadlineTask" ("createdAt", "dueAt", "id", "tags", "title", "updatedAt") SELECT "createdAt", "dueAt", "id", "tags", "title", "updatedAt" FROM "DeadlineTask";
DROP TABLE "DeadlineTask";
ALTER TABLE "new_DeadlineTask" RENAME TO "DeadlineTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
