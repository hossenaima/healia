import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { weighInStreak } from "@/lib/calendar";
import { Shell } from "@/components/shell";
import { WeightCalendar } from "@/components/weight-calendar";
import { HealthImport } from "@/components/health-import";
import { StreakTile } from "@/components/streak-tile";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const entries = await prisma.weightEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { date: true, weightLbs: true },
  });

  const today = todayIn(user.timezone);
  const streak = weighInStreak(
    entries.map((e) => e.date),
    today,
  );

  return (
    <Shell user={user} title="Calendar">
      <p className="mt-2 text-sm text-ink-muted">
        Tap any day to log or fix a weigh-in.
      </p>

      <StreakTile current={streak.current} best={streak.best} />

      <WeightCalendar entries={entries} today={today} units={user.units} />

      <section className="mt-8">
        <h2 className="eyebrow">Bring in history</h2>
        <HealthImport units={user.units} />
      </section>

      <Link
        href="/"
        className="eyebrow mt-8 inline-block transition-colors hover:!text-ink"
      >
        ← Back to weight
      </Link>
    </Shell>
  );
}
