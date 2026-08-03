"use client";

import { useActionState, useState } from "react";
import { suggestMealsAction, type SuggestResult } from "@/app/actions/eat";
import {
  LOCATIONS,
  LOCATION_LABELS,
  SATIETY_GOALS,
  SATIETY_LABELS,
  type Location,
  type SatietyGoal,
} from "@/lib/eat";

const INITIAL: SuggestResult = { ok: false };

export function EatForm({
  remaining,
  aiEnabled,
  hasTarget,
}: {
  remaining: number | null;
  aiEnabled: boolean;
  hasTarget: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    suggestMealsAction,
    INITIAL,
  );
  const [satiety, setSatiety] = useState<SatietyGoal>("high_protein");
  const [location, setLocation] = useState<Location>("home");
  const [ingredients, setIngredients] = useState("");

  // The action recomputes this server-side; the client copy is only for display.
  const budget = state.remaining ?? remaining;

  return (
    <>
      <section className="glass mt-4 p-5" aria-label="Calories left today">
        <p className="eyebrow">Left to spend today</p>
        <p className="tnum mt-1 text-5xl font-light leading-none tracking-tight">
          {budget === null ? "—" : budget.toLocaleString()}
          <span className="ml-2 font-sans text-base text-ink-faint">kcal</span>
        </p>
        {!hasTarget && (
          <p className="mt-3 text-sm text-ink-muted">
            Set a daily calorie target in Settings and this becomes your budget.
          </p>
        )}
      </section>

      <form action={formAction} className="card mt-4 p-5">
        <fieldset>
          <legend className="eyebrow">Keep me full with</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SATIETY_GOALS.map((goal) => (
              <Chip
                key={goal}
                name="satiety"
                value={goal}
                label={SATIETY_LABELS[goal]}
                checked={satiety === goal}
                onSelect={() => setSatiety(goal)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="eyebrow">Where</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LOCATIONS.map((place) => (
              <Chip
                key={place}
                name="location"
                value={place}
                label={LOCATION_LABELS[place]}
                checked={location === place}
                onSelect={() => setLocation(place)}
              />
            ))}
          </div>
        </fieldset>

        <label htmlFor="ingredients" className="eyebrow mt-5 block">
          Ingredients on hand (optional)
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          rows={2}
          maxLength={500}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="egg whites, spinach, salsa, greek yogurt"
          className="
            mt-2 w-full rounded-lg bg-surface-sunk p-3 text-sm
            placeholder:text-ink-faint focus:outline-2 focus:outline-trace
          "
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          Leave empty for general ideas. List what you have and the suggestions
          are built from it.
        </p>

        <button
          type="submit"
          disabled={pending || !aiEnabled || !hasTarget}
          title={aiEnabled ? undefined : "Needs an Anthropic API key."}
          className="
            mt-6 w-full rounded-lg bg-ink px-4 py-3 font-cond text-sm
            font-semibold uppercase tracking-widest text-ground
            transition-opacity hover:opacity-90 disabled:opacity-40
          "
        >
          {pending ? "Thinking" : "What can I eat?"}
        </button>

        {!aiEnabled && (
          <p className="mt-3 text-xs text-ink-muted">
            Suggestions need an Anthropic API key in your environment.
          </p>
        )}

        {state.error && (
          <p role="alert" className="mt-3 text-sm text-up">
            {state.error}
          </p>
        )}
      </form>

      {state.ok && state.suggestions && (
        <section className="mt-8" aria-label="Suggestions">
          <h2 className="eyebrow">
            {state.suggestions.length} option
            {state.suggestions.length === 1 ? "" : "s"} under{" "}
            {budget?.toLocaleString()} kcal
          </h2>

          <ul className="mt-3 space-y-3">
            {state.suggestions.map((s) => (
              <li key={s.name} className="card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="min-w-0 flex-1 font-cond text-base font-semibold">
                    {s.name}
                  </h3>
                  <span className="tnum shrink-0 text-sm font-medium">
                    {s.calories.toLocaleString()} kcal
                  </span>
                </div>

                <p className="mt-1.5 text-sm text-ink-muted">{s.description}</p>

                <ul className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <Macro label="P" value={s.proteinG} tint="var(--protein)" />
                  <Macro label="C" value={s.carbsG} tint="var(--carbs)" />
                  <Macro label="F" value={s.fatG} tint="var(--fat)" />
                  <li>Fiber {Math.round(s.fiberG)}g</li>
                </ul>

                <p className="mt-3 border-t border-rule pt-3 text-sm">
                  {s.satietyNote}
                </p>

                {s.usesOnHand.length > 0 && (
                  <p className="eyebrow mt-2">
                    Uses {s.usesOnHand.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-ink-muted">
            {state.note ? `${state.note} ` : ""}Figures are estimates for a
            typical preparation, not label values.
          </p>
        </section>
      )}
    </>
  );
}

function Chip({
  name,
  value,
  label,
  checked,
  onSelect,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`
        cursor-pointer rounded-full px-3.5 py-1.5 font-cond text-xs font-semibold
        uppercase tracking-widest transition-colors
        ${
          checked
            ? "bg-ink text-ground"
            : "bg-surface-sunk text-ink-muted hover:text-ink"
        }
      `}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function Macro({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: tint }}
      />
      {label} {Math.round(value)}g
    </li>
  );
}
