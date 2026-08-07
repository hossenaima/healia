-- Remembers which milestone has already been celebrated, so it is shown once
-- rather than on every visit. Existing accounts start at 0 and will be
-- congratulated on their next crossing, not retroactively for every past one.
ALTER TABLE "User" ADD COLUMN "milestoneLbs" INTEGER NOT NULL DEFAULT 0;
