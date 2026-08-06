"use client";

import { useOptimistic, useTransition } from "react";
import { setUnitsAction } from "@/app/actions/settings";
import type { Units } from "@/lib/units";

const OPTIONS: Units[] = ["lb", "kg"];

/**
 * Pounds or kilograms, for everything at once.
 *
 * The switch is optimistic so the press registers immediately, while the
 * server re-renders the page around it. Every figure comes from the one
 * stored value in pounds, so the chart, the ring and the log cannot end up
 * showing different units mid-change.
 */
export function UnitSwitch({ units }: { units: Units }) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(units);

  return (
    <div
      role="group"
      aria-label="Weight unit"
      className="flex gap-1 rounded-full bg-surface-sunk p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={shown === option}
          onClick={() => {
            if (shown === option) return;
            startTransition(async () => {
              setShown(option);
              await setUnitsAction(option);
            });
          }}
          className={`chip ${
            shown === option
              ? "bg-ink text-ground"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
