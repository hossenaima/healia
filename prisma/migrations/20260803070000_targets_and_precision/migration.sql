-- Daily targets, active burn, and the extra nutrition facts the dashboard and
-- the no-panic chart need. Every change is additive with a default, so existing
-- rows stay valid and nothing has to be backfilled.

ALTER TABLE "User"
  ADD COLUMN "calorieTarget"  INTEGER,
  ADD COLUMN "proteinTargetG" INTEGER,
  ADD COLUMN "fiberTargetG"   INTEGER;

ALTER TABLE "Meal"
  ADD COLUMN "portion"   DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "brothLeft" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MealItem"
  ADD COLUMN "fiberG"    DOUBLE PRECISION,
  ADD COLUMN "sodiumMg"  DOUBLE PRECISION,
  ADD COLUMN "precision" TEXT NOT NULL DEFAULT 'estimated';

CREATE TABLE "DayLog" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "date"           TEXT NOT NULL,
    "activeBurnKcal" INTEGER,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DayLog_userId_date_idx" ON "DayLog"("userId", "date");
CREATE UNIQUE INDEX "DayLog_userId_date_key" ON "DayLog"("userId", "date");

ALTER TABLE "DayLog" ADD CONSTRAINT "DayLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
