import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { addDays, formatDayLong, isDayKey, serverToday } from "@/lib/dates";
import { getEstimator } from "@/lib/ai/estimator";
import {
  estimateBand,
  mealNutrition,
  mealPrecision,
  sumNutrition,
} from "@/lib/nutrition";
import { Shell } from "@/components/shell";
import { MealForm } from "@/components/meal-form";
import { MacroBar } from "@/components/macro-bar";
import { DayTotals } from "@/components/day-totals";
import { ActiveBurnField } from "@/components/active-burn-field";
import { deleteMealAction } from "@/app/actions/meals";

export default async function MealsPage(props: PageProps<"/meals">) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { d } = await props.searchParams;
  const requested = typeof d === "string" && isDayKey(d) ? d : null;
  const date = requested ?? serverToday();
  const today = serverToday();

  // The trailing week is fetched alongside the day so the rolling buffer can be
  // computed without a second round trip.
  const weekStart = addDays(date, -6);
  const [meals, dayLog, weekMeals] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, date },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    }),
    prisma.meal.findMany({
      where: { userId: user.id, date: { gte: weekStart, lte: date } },
      include: { items: true },
    }),
  ]);

  const eaten = sumNutrition(meals.map(mealNutrition));

  // Averaged over days that actually have food logged — a day you forgot to log
  // is missing data, not a fast, and counting it as zero would flatter the mean.
  const perDay = new Map<string, number>();
  for (const meal of weekMeals) {
    const cals = mealNutrition(meal).calories;
    perDay.set(meal.date, (perDay.get(meal.date) ?? 0) + cals);
  }
  const loggedDays = [...perDay.values()].filter((c) => c > 0);
  const weeklyAverage = loggedDays.length
    ? loggedDays.reduce((a, b) => a + b, 0) / loggedDays.length
    : null;

  return (
    <Shell user={user} title="Meals">
      <nav
        aria-label="Choose a day"
        className="mt-5 flex items-center justify-between gap-3"
      >
        <DayLink date={addDays(date, -1)} label="← Previous" />
        <p className="text-center text-sm">
          {date === today ? "Today" : formatDayLong(date)}
        </p>
        {date >= today ? (
          <span className="eyebrow opacity-30">Next →</span>
        ) : (
          <DayLink date={addDays(date, 1)} label="Next →" />
        )}
      </nav>

      <DayTotals
        eaten={eaten}
        activeBurn={dayLog?.activeBurnKcal ?? null}
        calorieTarget={user.calorieTarget}
        proteinTargetG={user.proteinTargetG}
        fiberTargetG={user.fiberTargetG}
        mealCount={meals.length}
        weeklyAverage={weeklyAverage}
      />

      <ActiveBurnField date={date} value={dayLog?.activeBurnKcal ?? null} />

      <MealForm date={date} aiEnabled={getEstimator().available} />

      {meals.length > 0 && (
        <section className="mt-9" aria-label="Meals logged">
          <h2 className="eyebrow">Log</h2>

          <ul className="mt-3 space-y-3">
            {meals.map((meal) => {
              const n = mealNutrition(meal);
              const precision = mealPrecision(meal);
              const band = estimateBand(n.calories);
              const hasCalories = meal.items.some((i) => i.calories !== null);
              const estimated = meal.items.some((i) => i.source === "ai");

              // A manually entered meal stores one item named after the note,
              // so listing it would just repeat the line above it.
              const showItems =
                meal.items.length > 0 &&
                !(meal.items.length === 1 && meal.items[0].name === meal.note);

              return (
                <li key={meal.id} className="card p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-cond text-base font-semibold">
                      {meal.name}
                    </p>
                    <div className="flex shrink-0 items-baseline gap-3">
                      <span className="tnum text-sm font-medium">
                        {hasCalories
                          ? `${Math.round(n.calories).toLocaleString()} kcal`
                          : "—"}
                      </span>
                      <form action={deleteMealAction}>
                        <input type="hidden" name="id" value={meal.id} />
                        <button
                          type="submit"
                          aria-label={`Delete ${meal.name}`}
                          className="text-lg leading-none text-ink-faint transition-colors hover:text-up"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  </div>

                  <p className="mt-1.5 text-sm text-ink-muted">{meal.note}</p>

                  {hasCalories && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <PrecisionBadge precision={precision} />
                      {precision === "estimated" && (
                        <span className="tnum text-xs text-ink-muted">
                          {band.low.toLocaleString()}–
                          {band.high.toLocaleString()} kcal
                        </span>
                      )}
                    </div>
                  )}

                  {n.calories > 0 && <MacroBar macros={n} size="compact" />}

                  {showItems && (
                    <ul className="mt-3 space-y-1 border-t border-rule pt-3">
                      {meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate text-ink-muted">
                            {item.name}
                            {item.quantity && (
                              <span className="text-ink-faint">
                                {" "}
                                · {item.quantity}
                              </span>
                            )}
                          </span>
                          <span className="tnum shrink-0 text-xs">
                            {item.calories ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {estimated && (
                    <p className="eyebrow mt-3">Estimated by Claude</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {meals.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">
          Nothing logged for this day yet. Add as many meals as you like.
        </p>
      )}
    </Shell>
  );
}

function PrecisionBadge({ precision }: { precision: "exact" | "estimated" }) {
  const exact = precision === "exact";
  return (
    <span
      className="eyebrow flex items-center gap-1.5"
      title={
        exact
          ? "Read off a nutrition label."
          : "Oils, sauces and portions vary, so treat this as a range."
      }
    >
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: exact ? "var(--down)" : "var(--carbs)" }}
      />
      {exact ? "Exact" : "Estimated"}
    </span>
  );
}

function DayLink({ date, label }: { date: string; label: string }) {
  return (
    <Link
      href={`/meals?d=${date}`}
      className="eyebrow transition-colors hover:!text-ink"
    >
      {label}
    </Link>
  );
}
