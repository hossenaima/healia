"use client";

import { useEffect, useState } from "react";
import { acknowledgeMilestoneAction } from "@/app/actions/settings";
import type { Milestone } from "@/lib/calendar";
import { fromLbs, type Units } from "@/lib/units";

/**
 * A moment, once.
 *
 * Marked as seen as soon as it renders, so it greets you the morning you cross
 * a milestone and never again — congratulation that repeats every visit stops
 * being congratulation and becomes furniture.
 *
 * Deliberately not a modal. The point of opening this tab is the number; a
 * dialog in front of it would be celebrating at the user rather than with them.
 */
export function MilestoneBanner({
  milestone,
  units,
}: {
  milestone: Milestone;
  units: Units;
}) {
  const [dismissed, setDismissed] = useState(false);

  const lbs = milestone?.kind === "lost" ? milestone.lbs : null;
  useEffect(() => {
    if (milestone?.kind === "lost") void acknowledgeMilestoneAction(milestone.lbs);
  }, [milestone?.kind, lbs]);

  if (!milestone || dismissed) return null;

  const goal = milestone.kind === "goal";
  const amount =
    milestone.kind === "lost"
      ? `${Math.round(fromLbs(milestone.lbs, units))} ${units}`
      : null;

  return (
    <div
      role="status"
      className="celebrate card mt-5 flex items-start gap-3 p-5"
    >
      <span aria-hidden className="mt-0.5 text-lg leading-none">
        {goal ? "◎" : "◆"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {goal ? "You reached your goal weight." : `${amount} down.`}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {goal
            ? "Worth stopping on. Set a new goal in Settings whenever you are ready."
            : "That is the trend, not one good morning — the average had to move for this."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 px-1 text-lg leading-none text-ink-faint transition-colors hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
