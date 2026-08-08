import "server-only";

import { prisma } from "@/lib/db";
import { weighInStreak } from "@/lib/calendar";
import { todayIn } from "@/lib/dates";
import { mealNutrition } from "@/lib/nutrition";

export type FriendSummary = {
  id: string;
  name: string;
  /** Most recent weigh-in, in pounds. Null when never logged, or not shared. */
  latestLbs: number | null;
  latestDate: string | null;
  /** Change since their previous weigh-in, in pounds. */
  changeLbs: number | null;
  /** Today's intake in kcal, when they share it. */
  caloriesToday: number | null;
  /** Names of today's meals, when they share them. */
  mealsToday: string[];
  streak: number;
  loggedToday: boolean;
  /** What they have chosen to show. Sent so the card can say "not shared"
   *  rather than silently render an empty row. */
  shares: { weight: boolean; calories: boolean; meals: boolean };
};

/**
 * What each friend has chosen to show.
 *
 * The decision is the *subject's*, never the viewer's: your flags govern what
 * others see of you. Enforced here rather than in the component, because a
 * value that reaches the client has already been shared regardless of whether
 * anything renders it.
 *
 * The streak and "logged today" are always visible. They say that a person
 * turned up, not what they weigh or ate, and with everything else off a friend
 * card would otherwise be a name and nothing to encourage.
 */
const FRIEND_FIELDS = {
  id: true,
  name: true,
  timezone: true,
  shareWeight: true,
  shareCalories: true,
  shareMeals: true,
} as const;

export async function friendSummaries(userId: string): Promise<FriendSummary[]> {
  const links = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: FRIEND_FIELDS },
      addressee: { select: FRIEND_FIELDS },
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

  // Only fetch food for the people who share some of it, and only their own
  // today — "today" differs per person, so each is filtered to their own date.
  const foodSharers = others.filter((o) => o.shareCalories || o.shareMeals);
  const meals = foodSharers.length
    ? await prisma.meal.findMany({
        where: {
          OR: foodSharers.map((o) => ({
            userId: o.id,
            date: todayIn(o.timezone),
          })),
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const mealsByUser = new Map<string, typeof meals>();
  for (const m of meals) {
    mealsByUser.set(m.userId, [...(mealsByUser.get(m.userId) ?? []), m]);
  }

  return others.map((other) => {
    const mine = byUser.get(other.id) ?? [];
    const latest = mine.at(-1) ?? null;
    const previous = mine.at(-2) ?? null;
    const today = todayIn(other.timezone);
    const streak = weighInStreak(mine.map((m) => m.date), today);
    const theirMeals = mealsByUser.get(other.id) ?? [];

    return {
      id: other.id,
      name: other.name,
      latestLbs: other.shareWeight ? (latest?.weightLbs ?? null) : null,
      latestDate: other.shareWeight ? (latest?.date ?? null) : null,
      changeLbs:
        other.shareWeight && latest && previous
          ? latest.weightLbs - previous.weightLbs
          : null,
      caloriesToday: other.shareCalories
        ? Math.round(
            theirMeals.reduce((sum, m) => sum + mealNutrition(m).calories, 0),
          )
        : null,
      mealsToday: other.shareMeals ? theirMeals.map((m) => m.name) : [],
      streak: streak.current,
      // Still true when weight is private: it says they turned up, not what
      // the scale said.
      loggedToday: latest?.date === today,
      shares: {
        weight: other.shareWeight,
        calories: other.shareCalories,
        meals: other.shareMeals,
      },
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
