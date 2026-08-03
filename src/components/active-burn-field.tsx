"use client";

import { useRef } from "react";
import { saveActiveBurnAction } from "@/app/actions/meals";

/**
 * Calories burned through activity, typed by hand.
 *
 * Not read from Apple Health: a web app has no live sync, so the number would
 * only be as fresh as the last manual export — stale data presented as current
 * is worse than a figure you knowingly typed.
 */
export function ActiveBurnField({
  date,
  value,
}: {
  date: string;
  value: number | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={saveActiveBurnAction} className="card mt-3 p-4">
      <input type="hidden" name="date" value={date} />
      <label htmlFor="activeBurn" className="eyebrow block">
        Active burn
      </label>
      <div className="mt-2 flex items-end gap-3">
        <input
          id="activeBurn"
          name="activeBurn"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={value ?? ""}
          placeholder="—"
          // Blur-to-save keeps this out of the way: it is a number you adjust
          // once, not a form you submit.
          onBlur={() => formRef.current?.requestSubmit()}
          className="
            tnum w-28 border-b border-rule bg-transparent pb-1 text-lg
            placeholder:text-ink-faint focus:border-trace focus:outline-none
          "
        />
        <span className="pb-1 text-sm text-ink-muted">
          kcal from exercise today
        </span>
      </div>
    </form>
  );
}
