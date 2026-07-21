-- CreateTable
CREATE TABLE "CategoryItemSchedule" (
    "type" TEXT NOT NULL PRIMARY KEY,
    "cadence" TEXT NOT NULL,
    "anchor" TEXT,
    "timeOfDayPreference" TEXT,
    "preferredStartTime" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
