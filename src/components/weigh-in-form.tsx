"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWeightAction, type ActionResult } from "@/app/actions/weight";
import { clientToday, formatDayLong } from "@/lib/dates";
import type { Units } from "@/lib/units";

const INITIAL: ActionResult = { ok: false };

export function WeighInForm({
  today,
  existing,
  units,
}: {
  /** Resolved from the account's timezone on the server. */
  today: string;
  /** Today's weight in display units, if already logged. */
  existing: number | null;
  units: Units;
}) {
  const [state, formAction, pending] = useActionState(saveWeightAction, INITIAL);

  // The server's idea of "today" comes from APP_TIMEZONE; the browser knows the
  // real one. Start with the server value so markup matches, then correct.
  const [date, setDate] = useState(today);
  useEffect(() => setDate(clientToday()), []);

  // The box is for what you are about to type, never for what is already
  // stored. Emptying it is the receipt for a save — a number left sitting
  // there reads as nothing having happened. Today's reading is not lost: it
  // is in the placeholder, in the ring above, and in the log below.
  const [value, setValue] = useState("");

  // Whatever the server last sent back, in whatever unit is currently
  // selected. When that changes — a save landed, or the unit was switched —
  // the box clears rather than holding a stale number under a fresh label.
  const [lastSent, setLastSent] = useState(existing);
  if (lastSent !== existing) {
    setLastSent(existing);
    setValue("");
  }

  const editing = existing !== null;

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="date" value={date} />

      <div className="rounded-xl border border-rule bg-surface p-5">
        <label htmlFor="weight" className="eyebrow block">
          {editing ? "Correct this morning" : "This morning"}
        </label>
        <p className="mt-1 text-sm text-ink-muted">{formatDayLong(date)}</p>

        <div className="mt-3 flex items-baseline gap-3">
          <input
            id="weight"
            name="weight"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={editing ? existing.toFixed(1) : "000.0"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={state.error ? "weigh-in-error" : undefined}
            className="
              tnum w-full min-w-0 border-b-2 border-rule bg-transparent pb-1
              text-5xl font-light tracking-tight
              placeholder:text-ink-faint/40 focus:border-trace focus:outline-none
            "
          />
          <span className="eyebrow shrink-0">{units}</span>
        </div>

        <input
          name="note"
          type="text"
          placeholder="Note (optional)"
          maxLength={500}
          className="
            mt-4 w-full border-b border-rule bg-transparent pb-1 text-sm
            placeholder:text-ink-faint focus:border-trace focus:outline-none
          "
        />

        <button
          type="submit"
          disabled={pending || value.trim() === ""}
          className="btn btn-primary mt-5 w-full"
        >
          {pending ? "Saving" : editing ? "Update weigh-in" : "Save weigh-in"}
        </button>

        <p
          id="weigh-in-error"
          role="status"
          className={`mt-3 text-sm ${state.error ? "text-up" : "text-ink-muted"}`}
        >
          {state.error ??
            (state.ok && editing
              ? `Logged ${existing.toFixed(1)} ${units} for today.`
              : "")}
        </p>
      </div>
    </form>
  );
}
