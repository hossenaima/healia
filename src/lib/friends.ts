import "server-only";

import { prisma } from "@/lib/db";
import { weighInStreak } from "@/lib/calendar";
import { todayIn } from "@/lib/dates";

export type FriendSummary = {
  id: string;
  name: string;
  /** Most recent weigh-in, in pounds. Null if they have never logged one. */
  latestLbs: number | null;
  latestDate: string | null;
  /** Change since their previous weigh-in, in pounds. */
  changeLbs: number | null;
  streak: number;
  loggedToday: boolean;
};

/**
 * What a friend is allowed to see: weigh-ins and the streak. Meals are
 * deliberately absent — food logs are the half people are most self-conscious
 * about, and someone watching yours is a good way to make you log less
 * honestly.
 */
export async function friendSummaries(userId: string): Promise<FriendSummary[]> {
  const links = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, timezone: true } },
      addressee: { select: { id: true, name: true, timezone: true } },
    },
  });

  const others = links.map((l) =>
    l.requesterId === userId ? l.addressee : l.requester,
  );
  if (others.length === 0) return [];

  const entries = await prisma.weightEntry.findMany({
    where: { userId: { in: others.map((o) => o.id) } },
    orderBy: { date: "asc" },
    select: { userId: true, date: true, weightLbs: true },
  });

  const byUser = new Map<string, typeof entries>();
  for (const e of entries) {
    byUser.set(e.userId, [...(byUser.get(e.userId) ?? []), e]);
  }

  return others.map((other) => {
    const mine = byUser.get(other.id) ?? [];
    const latest = mine.at(-1) ?? null;
    const previous = mine.at(-2) ?? null;
    const today = todayIn(other.timezone);
    const streak = weighInStreak(mine.map((m) => m.date), today);

    return {
      id: other.id,
      name: other.name,
      latestLbs: latest?.weightLbs ?? null,
      latestDate: latest?.date ?? null,
      changeLbs:
        latest && previous ? latest.weightLbs - previous.weightLbs : null,
      streak: streak.current,
      loggedToday: latest?.date === today,
    };
  });
}

/**
 * How long a note stays after it has been read.
 *
 * Encouragement is about a moment — "nice work today" a fortnight later is
 * clutter, not warmth. Unread notes never expire: the clock starts when you
 * have actually seen it, not when it was sent, so nothing vanishes unread.
 */
export const NOTE_TTL_HOURS = 12;

export function noteCutoff(now = new Date()): Date {
  return new Date(now.getTime() - NOTE_TTL_HOURS * 60 * 60 * 1000);
}
