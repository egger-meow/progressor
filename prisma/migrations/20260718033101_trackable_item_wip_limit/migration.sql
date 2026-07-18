-- CreateTable
CREATE TABLE "TrackableItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "unitCount" INTEGER NOT NULL,
    "unitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "estimatedDays" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WipLimit" (
    "type" TEXT NOT NULL PRIMARY KEY,
    "maxInProgress" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "TrackableItem_type_status_idx" ON "TrackableItem"("type", "status");
