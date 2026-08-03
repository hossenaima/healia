-- Meals are no longer confined to four fixed slots: a day holds as many as the
-- user logs, each with a free-text name.
--
-- Written as a RENAME rather than the drop-and-add a generated diff would
-- produce, so existing meals keep their label instead of being blanked.
ALTER TABLE "Meal" RENAME COLUMN "slot" TO "name";
ALTER TABLE "Meal" ALTER COLUMN "name" SET DEFAULT 'Meal';
