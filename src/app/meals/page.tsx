import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { addDays, formatDayLong, isDayKey, serverToday } from "@/lib/dates";
import { getEstimator } from "@/lib/ai/estimator";
import { Shell } from "@/components/shell";
import { MealForm } from "@/components/meal-form";
import { deleteMealAction } from "@/app/actions/meals";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meals";

const SLOT_ORDER: readonly string[] = MEAL_SLOTS;

export default async function MealsPage(props: PageProps<"/meals">) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { d } = await props.searchParams;
  const requested = typeof d === "string" && isDayKey(d) ? d : null;
  const date = requested ?? serverToday();
  const today = serverToday();

  const meals = await prisma.meal.findMany({
    where: { userId: user.id, date },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const sorted = [...meals].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );

  const total = meals.reduce(
    (sum, meal) =>
      sum + meal.items.reduce((s, item) => s + (item.calories ?? 0), 0),
    0,
  );

  const counted = meals.some((m) => m.items.some((i) => i.calories !== null));

  return (
    <Shell user={user} eyebrow="Section 02 — Intake" title="Meals">
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

      <section className="mt-5" aria-label="Calories logged">
        <div className="flex items-end justify-between rounded-xl border border-rule bg-surface px-5 py-4">
          <div>
            <p className="eyebrow">Logged today</p>
            <p className="tnum mt-1 text-5xl font-light leading-none tracking-tight">
              {counted ? total.toLocaleString() : "—"}
              <span className="ml-2 font-sans text-base text-ink-faint">
                kcal
              </span>
            </p>
          </div>
          <p className="tnum text-sm text-ink-muted">
            {meals.length} {meals.length === 1 ? "meal" : "meals"}
          </p>
        </div>
      </section>

      <MealForm date={date} aiEnabled={getEstimator().available} />

      {sorted.length > 0 && (
        <section className="mt-10" aria-label="Meals logged">
          <h2 className="eyebrow">Log</h2>

          <ul className="mt-3 space-y-3">
            {sorted.map((meal) => {
              const mealTotal = meal.items.reduce(
                (s, item) => s + (item.calories ?? 0),
                0,
              );
              const hasCalories = meal.items.some((i) => i.calories !== null);
              const estimated = meal.items.some((i) => i.source === "ai");

              // A manually entered meal stores one item named after the note,
              // so listing it would just repeat the line above it.
              const showItems =
                meal.items.length > 0 &&
                !(meal.items.length === 1 && meal.items[0].name === meal.note);

              return (
                <li
                  key={meal.id}
                  className="rounded-xl border border-rule bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="eyebrow">
                      {SLOT_LABELS[meal.slot as MealSlot] ?? meal.slot}
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className="tnum text-sm font-medium">
                        {hasCalories ? `${mealTotal.toLocaleString()} kcal` : "—"}
                      </span>
                      <form action={deleteMealAction}>
                        <input type="hidden" name="id" value={meal.id} />
                        <button
                          type="submit"
                          aria-label={`Delete this ${meal.slot}`}
                          className="text-lg leading-none text-ink-faint transition-colors hover:text-up"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  </div>

                  <p className="mt-2 text-sm">{meal.note}</p>

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
                    <p className="eyebrow mt-3">Estimated · check before trusting</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sorted.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">
          Nothing logged for this day yet.
        </p>
      )}
    </Shell>
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
