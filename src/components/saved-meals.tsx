"use client";

import { useState, useTransition } from "react";
import { repeatMealAction } from "@/app/actions/meals";
import type { RepeatableMeal } from "@/lib/meals";
import { formatDayShort } from "@/lib/dates";

/**
 * Meals you have logged before, one tap to log again.
 *
 * Nothing here calls the model. The point is that describing your usual
 * breakfast is a thing you should have to do once.
 */
export function SavedMeals({
  meals,
  date,
}: {
  meals: RepeatableMeal[];
  date: string;
}) {
  const [pending, startTransition] = useTransition();
  const [logging, setLogging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (meals.length === 0) return null;

  return (
    <section className="mt-9" aria-label="Log again">
      <h2 className="eyebrow">Log again</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Already worked out — no estimate needed.
      </p>

      <ul className="mt-3 space-y-2">
        {meals.map((meal, i) => (
          <li
            key={meal.id}
            className="settle card flex items-center gap-3 p-4"
            style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{meal.name}</p>
              <p className="truncate text-xs text-ink-muted">
                <span className="tnum">{meal.calories}</span> kcal ·{" "}
                {meal.itemCount} item{meal.itemCount === 1 ? "" : "s"} · last on{" "}
                {formatDayShort(meal.lastLogged)}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setLogging(meal.id);
                startTransition(async () => {
                  const r = await repeatMealAction(meal.id, date);
                  if (!r.ok) setError(r.error ?? "Could not log that again.");
                  setLogging(null);
                });
              }}
              className="btn btn-soft shrink-0 !py-2"
            >
              {logging === meal.id ? "Adding" : "Add"}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="status" className="mt-2 text-sm text-up">
          {error}
        </p>
      )}
    </section>
  );
}
