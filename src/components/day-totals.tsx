"use client";

import { useState } from "react";
import { MacroBar } from "@/components/macro-bar";
import type { Nutrition } from "@/lib/nutrition";

/**
 * The day's headline figures. Raw intake and net (intake − active burn) are a
 * toggle rather than two tiles: they answer the same question, and showing both
 * at once invites reading the wrong one.
 */
export function DayTotals({
  eaten,
  activeBurn,
  calorieTarget,
  proteinTargetG,
  fiberTargetG,
  mealCount,
  weeklyAverage,
  isToday,
}: {
  eaten: Nutrition;
  activeBurn: number | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  fiberTargetG: number | null;
  mealCount: number;
  weeklyAverage: number | null;
  /** A day still in progress can only be "on track"; a past one is settled. */
  isToday: boolean;
}) {
  const [net, setNet] = useState(false);
  const canNet = activeBurn !== null && activeBurn > 0;

  const calories = Math.round(
    net && canNet ? eaten.calories - activeBurn : eaten.calories,
  );
  const remaining =
    calorieTarget === null ? null : Math.round(calorieTarget - calories);

  // Landing under target with nothing logged is not an achievement, it is an
  // empty day — so this needs food in it before it says anything.
  const onTarget =
    calorieTarget !== null && mealCount > 0 && remaining !== null && remaining >= 0;

  return (
    <section className="glass mt-4 p-5" aria-label="Day totals">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{net && canNet ? "Net today" : "Logged today"}</p>
          <p className="tnum mt-1 text-5xl font-light leading-none tracking-tight">
            {eaten.calories > 0 ? calories.toLocaleString() : "—"}
            <span className="ml-2 font-sans text-base text-ink-faint">kcal</span>
          </p>
        </div>

        {canNet && (
          <button
            type="button"
            onClick={() => setNet((v) => !v)}
            aria-pressed={net}
            className="chip shrink-0 bg-surface-sunk text-ink-muted hover:text-ink"
          >
            {net ? "Show raw" : "Show net"}
          </button>
        )}
      </div>

      <p className="tnum mt-2 text-sm text-ink-muted">
        {mealCount} {mealCount === 1 ? "meal" : "meals"}
        {canNet && (
          <> · {activeBurn.toLocaleString()} kcal burned</>
        )}
        {remaining !== null && (
          <>
            {" · "}
            <span className={remaining < 0 ? "text-up" : "text-down"}>
              {remaining >= 0
                ? `${remaining.toLocaleString()} left`
                : `${Math.abs(remaining).toLocaleString()} over`}
            </span>
          </>
        )}
      </p>

      {(proteinTargetG !== null || fiberTargetG !== null) && (
        <div className="mt-4 space-y-3">
          {proteinTargetG !== null && (
            <Progress
              label="Protein"
              value={eaten.proteinG}
              target={proteinTargetG}
              tint="var(--protein)"
            />
          )}
          {fiberTargetG !== null && (
            <Progress
              label="Fiber"
              value={eaten.fiberG}
              target={fiberTargetG}
              tint="var(--carbs)"
            />
          )}
        </div>
      )}

      {eaten.calories > 0 && <MacroBar macros={eaten} />}

      {onTarget && (
        <p
          role="status"
          className="celebrate mt-4 flex items-center gap-2 rounded-xl bg-surface-sunk px-3 py-2 text-sm"
        >
          <span aria-hidden className="text-down">
            ◆
          </span>
          <span>
            {isToday ? (
              <>
                On track — <span className="tnum">{remaining.toLocaleString()}</span>{" "}
                kcal still in budget.
              </>
            ) : (
              <>Finished this day on target.</>
            )}
          </span>
        </p>
      )}

      {weeklyAverage !== null && (
        <p className="tnum mt-4 border-t border-rule pt-3 text-xs text-ink-muted">
          7-day average {Math.round(weeklyAverage).toLocaleString()} kcal
          {calorieTarget !== null && (
            <>
              {" — "}
              {weeklyAverage <= calorieTarget
                ? "a heavier day still averages out"
                : `${Math.round(weeklyAverage - calorieTarget).toLocaleString()} over target across the week`}
            </>
          )}
        </p>
      )}
    </section>
  );
}

function Progress({
  label,
  value,
  target,
  tint,
}: {
  label: string;
  value: number;
  target: number;
  tint: string;
}) {
  const grams = Math.round(value);
  const percent = Math.min(100, (value / target) * 100);
  const done = grams >= target;

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-1.5 text-ink-muted">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: tint }}
          />
          {label}
        </span>
        <span className="tnum">
          {grams}
          <span className="text-ink-faint">/{target}g</span>
          {done && <span className="ml-1.5 text-down">✓</span>}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${grams} of ${target} grams`}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%`, backgroundColor: tint }}
        />
      </div>
    </div>
  );
}
