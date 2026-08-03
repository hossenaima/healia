import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser, hasAnyUser } from "@/lib/auth";
import { serverToday, formatDayShort } from "@/lib/dates";
import { formatDelta, fromLbs, formatWeight, type Units } from "@/lib/units";
import { Shell } from "@/components/shell";
import { WeighInForm } from "@/components/weigh-in-form";
import { WeightChart } from "@/components/weight-chart";
import { deleteWeightAction } from "@/app/actions/weight";
import { WaterWeightBanner } from "@/components/water-weight-banner";
import { flaggedMeals, rollingAverage } from "@/lib/nutrition";
import { addDays } from "@/lib/dates";

// Auth state and the log itself change per request; nothing here may be
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function WeightPage() {
  if (!(await hasAnyUser())) redirect("/signup");
  const user = await currentUser();
  if (!user) redirect("/login");

  // Scoped to this account — the other user's log is never read here.
  const entries = await prisma.weightEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  // Only the last couple of days of meals are needed: the banner explains an
  // overnight jump, so anything older cannot be the cause.
  const latestDate = entries.at(-1)?.date ?? serverToday();
  const recentMeals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      date: { gte: addDays(latestDate, -2), lte: latestDate },
    },
    include: { items: true },
  });

  const { units, goalWeightLbs } = user;
  const today = serverToday();

  const latest = entries.at(-1) ?? null;
  const previous = entries.at(-2) ?? null;
  const todayEntry = entries.find((e) => e.date === today) ?? null;

  // Falls back to the earliest logged weigh-in when no start weight is set, so
  // "since start" means something from day one.
  const startLbs = user.startWeightLbs ?? entries[0]?.weightLbs ?? null;

  // A 7-day trailing mean over calendar days, so gaps in logging do not
  // compress the window and overstate a short-term swing.
  const byDate = new Map(entries.map((e) => [e.date, e.weightLbs]));
  const calendar: Array<{ date: string; value: number | null }> = [];
  if (entries.length > 0) {
    for (let d = entries[0].date; d <= latestDate; d = addDays(d, 1)) {
      calendar.push({ date: d, value: byDate.get(d) ?? null });
    }
  }
  const trendByDate = new Map(
    rollingAverage(calendar, 7).map((r) => [r.date, r.average]),
  );

  const sinceLast =
    latest && previous ? latest.weightLbs - previous.weightLbs : null;
  const sinceStart =
    latest && startLbs !== null ? latest.weightLbs - startLbs : null;
  const toGoal =
    latest && goalWeightLbs !== null ? latest.weightLbs - goalWeightLbs : null;

  // Undefined when start and goal coincide — there is no distance to be a
  // fraction of, and dividing would blow up.
  const progress =
    startLbs !== null &&
    goalWeightLbs !== null &&
    latest &&
    startLbs !== goalWeightLbs
      ? clampPercent(
          ((startLbs - latest.weightLbs) / (startLbs - goalWeightLbs)) * 100,
        )
      : null;

  // Explain an overnight jump when a flagged meal came before it. The window
  // reaches back through the previous day so a late dinner still counts.
  const flagged = flaggedMeals(
    recentMeals.filter(
      (m) => m.date >= addDays(latestDate, -1) && m.date <= latestDate,
    ),
  );
  const priorTags = [...new Set(flagged.flatMap((f) => f.tags))];
  // Name the most recent offender — that is the one still in the system.
  const culpritDate = flagged.map((f) => f.date).sort().at(-1) ?? null;
  const overnightGain =
    latest && previous && latest.date === addDays(previous.date, 1)
      ? latest.weightLbs - previous.weightLbs
      : null;
  const showBanner =
    overnightGain !== null &&
    overnightGain >= 0.8 &&
    priorTags.length > 0 &&
    culpritDate !== null;

  return (
    <Shell user={user} title="Weight">
      {showBanner && (
        <WaterWeightBanner
          gainLbs={fromLbs(overnightGain, units)}
          units={units}
          tags={priorTags}
          onDate={culpritDate!}
        />
      )}
      {latest ? (
        <section className="mt-6" aria-label="Current reading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                {latest.date === today
                  ? "Today"
                  : `Last logged ${formatDayShort(latest.date)}`}
              </p>
              <p className="tnum mt-1 text-6xl font-light leading-none tracking-tight">
                {fromLbs(latest.weightLbs, units).toFixed(1)}
                <span className="ml-2 font-sans text-lg text-ink-faint">
                  {units}
                </span>
              </p>
            </div>
            {progress !== null && (
              <div className="text-right">
                <p className="eyebrow">To goal</p>
                <p className="tnum mt-1 text-2xl font-light leading-none">
                  {progress.toFixed(0)}%
                </p>
              </div>
            )}
          </div>

          {progress !== null && (
            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
              role="img"
              aria-label={`${progress.toFixed(0)} percent of the way from your start weight to your goal`}
            >
              <div
                className="h-full rounded-full bg-trace"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Since last" deltaLbs={sinceLast} units={units} />
            <Stat label="Since start" deltaLbs={sinceStart} units={units} />
            <div className="card px-3 py-3">
              <dt className="eyebrow">Left to go</dt>
              <dd className="tnum mt-1 whitespace-nowrap text-sm font-medium sm:text-lg">
                {toGoal === null
                  ? "—"
                  : toGoal <= 0
                    ? "Reached"
                    : formatWeight(toGoal, units)}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          No weigh-ins yet. Add this morning&rsquo;s to start the line, or{" "}
          <Link href="/backfill" className="underline underline-offset-2">
            bring in your history
          </Link>
          .
        </p>
      )}

      <WeighInForm
        serverToday={today}
        existing={
          todayEntry ? round1(fromLbs(todayEntry.weightLbs, units)) : null
        }
        units={units}
      />

      <section className="mt-8" aria-label="Weight over time">
        <h2 className="eyebrow">Morning weight over time</h2>
        <WeightChart
          points={entries.map((e) => ({
            date: e.date,
            weightLbs: e.weightLbs,
            trendLbs: trendByDate.get(e.date) ?? null,
          }))}
          goalLbs={goalWeightLbs}
          units={units}
        />
      </section>

      {entries.length > 0 && (
        <section className="mt-10" aria-label="Logged weigh-ins">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Log</h2>
            <Link
              href="/backfill"
              className="eyebrow transition-colors hover:!text-ink"
            >
              Add past entries
            </Link>
          </div>

          <ul className="card mt-3 divide-y divide-rule">
            {[...entries]
              .reverse()
              .slice(0, 30)
              .map((entry, i, list) => {
                const prior = list[i + 1];
                const delta = prior ? entry.weightLbs - prior.weightLbs : null;

                return (
                  <li
                    key={entry.date}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{formatDayShort(entry.date)}</p>
                      {entry.note && (
                        <p className="truncate text-xs text-ink-muted">
                          {entry.note}
                        </p>
                      )}
                    </div>

                    <span className="tnum text-sm">
                      {fromLbs(entry.weightLbs, units).toFixed(1)}
                    </span>

                    <span className="tnum w-24 text-right text-xs">
                      {delta === null ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        <DeltaText deltaLbs={delta} units={units} />
                      )}
                    </span>

                    <form action={deleteWeightAction}>
                      <input type="hidden" name="date" value={entry.date} />
                      <button
                        type="submit"
                        aria-label={`Delete the weigh-in for ${formatDayShort(entry.date)}`}
                        className="px-1 text-lg leading-none text-ink-faint transition-colors hover:text-up"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </Shell>
  );
}

function Stat({
  label,
  deltaLbs,
  units,
}: {
  label: string;
  deltaLbs: number | null;
  units: Units;
}) {
  return (
    <div className="card px-3 py-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum mt-1 whitespace-nowrap text-sm font-medium sm:text-lg">
        {deltaLbs === null ? "—" : <DeltaText deltaLbs={deltaLbs} units={units} />}
      </dd>
    </div>
  );
}

/** Direction is carried by an arrow and a sign, never by color alone. */
function DeltaText({ deltaLbs, units }: { deltaLbs: number; units: Units }) {
  const flat = Math.abs(fromLbs(deltaLbs, units)) < 0.05;
  const tone = flat ? "text-ink-muted" : deltaLbs < 0 ? "text-down" : "text-up";
  const arrow = flat ? "" : deltaLbs < 0 ? "↓ " : "↑ ";

  return (
    <span className={tone}>
      {arrow}
      {formatDelta(deltaLbs, units)}
    </span>
  );
}

function clampPercent(n: number) {
  return Math.max(0, Math.min(100, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
