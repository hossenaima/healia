-- The day boundary was one server-wide setting, so anyone outside that zone had
-- their weigh-ins and meals filed under the wrong day. Each account now carries
-- its own, captured from the browser at sign-in.
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York';
