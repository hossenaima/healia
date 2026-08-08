-- Per-account sharing, applying to all friends at once.
--
-- Weight defaults true because accepted friends could already see it, and
-- flipping it off here would silently withdraw something without being asked.
-- Calories and meals default false for the mirror-image reason: they were
-- never visible, so switching them on by default would publish food logs on
-- the user's behalf.
ALTER TABLE "User" ADD COLUMN "shareWeight"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "shareCalories" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "shareMeals"    BOOLEAN NOT NULL DEFAULT false;
