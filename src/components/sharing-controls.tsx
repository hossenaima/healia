"use client";

import { useState, useTransition } from "react";
import { setSharingAction } from "@/app/actions/friends";

/**
 * What your friends see of you — one setting covering all of them.
 *
 * Stated as "friends can see", not "share my…", because the thing worth being
 * unambiguous about is who ends up looking. Held locally so a tap answers
 * immediately; the server is the record but not the render.
 */
export function SharingControls({
  shareWeight,
  shareMeals,
  friendCount,
}: {
  shareWeight: boolean;
  shareMeals: boolean;
  friendCount: number;
}) {
  const [weight, setWeight] = useState(shareWeight);
  const [meals, setMeals] = useState(shareMeals);
  const [, startSaving] = useTransition();

  const save = (input: Parameters<typeof setSharingAction>[0]) =>
    startSaving(async () => {
      await setSharingAction(input);
    });

  return (
    <section className="mt-8" aria-label="What friends can see">
      <h2 className="eyebrow">What friends can see</h2>
      <div className="card mt-3 p-5">
        <p className="text-xs text-ink-muted">
          {friendCount === 0
            ? "Applies to everyone you add."
            : `Applies to all ${friendCount} of your friends.`}{" "}
          Your streak is always visible — it says you turned up, not what the
          scale said.
        </p>

        <div className="mt-4 space-y-1">
          <Toggle
            label="Weight"
            hint="Your latest weigh-in and the change since the one before."
            checked={weight}
            onChange={(v) => {
              setWeight(v);
              save({ shareWeight: v });
            }}
          />
          <Toggle
            label="Meals and calories"
            hint="Today's total, and each meal with what it cost."
            checked={meals}
            onChange={(v) => {
              setMeals(v);
              save({ shareMeals: v });
            }}
          />
        </div>
      </div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="
          relative h-6 w-10 shrink-0 rounded-full bg-rule transition-colors
          peer-checked:bg-trace peer-focus-visible:outline-2
          peer-focus-visible:outline-offset-2 peer-focus-visible:outline-trace
          after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5
          after:rounded-full after:bg-ground after:transition-transform
          after:content-[''] peer-checked:after:translate-x-4
        "
      />
    </label>
  );
}
