-- Friends, encouragements, and push subscriptions. All additive.

ALTER TABLE "User" ADD COLUMN "reminderHour" INTEGER;

CREATE TABLE "Friendship" (
    "id"          TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Encouragement" (
    "id"        TEXT NOT NULL,
    "fromId"    TEXT NOT NULL,
    "toId"      TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Encouragement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Encouragement_toId_createdAt_idx" ON "Encouragement"("toId", "createdAt");
ALTER TABLE "Encouragement" ADD CONSTRAINT "Encouragement_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encouragement" ADD CONSTRAINT "Encouragement_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PushSubscription" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "endpoint"  TEXT NOT NULL,
    "p256dh"    TEXT NOT NULL,
    "auth"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
