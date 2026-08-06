-- Reminder on/off used to be "is reminderHour null". Splitting the two lets a
-- person keep their chosen time while the reminder is off, and leaves room for
-- kinds of notification that have no time at all.
ALTER TABLE "User" ADD COLUMN "notifyWeighIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyFriends" BOOLEAN NOT NULL DEFAULT true;

-- Anyone who had deliberately switched reminders off keeps them off.
UPDATE "User" SET "notifyWeighIn" = false WHERE "reminderHour" IS NULL;
UPDATE "User" SET "reminderHour" = 8 WHERE "reminderHour" IS NULL;

ALTER TABLE "User" ALTER COLUMN "reminderHour" SET DEFAULT 8;
ALTER TABLE "User" ALTER COLUMN "reminderHour" SET NOT NULL;
