"use client";

import { useActionState } from "react";
import {
  changePinAction,
  saveSettingsAction,
  type SettingsResult,
} from "@/app/actions/settings";
import type { Units } from "@/lib/units";

const INITIAL: SettingsResult = { ok: false };

export function GoalForm({
  units,
  goalWeight,
  startWeight,
  heightInches,
  calorieTarget,
  proteinTargetG,
  fiberTargetG,
}: {
  units: Units;
  goalWeight: number | null;
  startWeight: number | null;
  heightInches: number | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  fiberTargetG: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveSettingsAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="mt-4 rounded-xl border border-rule bg-surface p-5">
      <fieldset>
        <legend className="eyebrow">Units</legend>
        <div className="mt-2 flex gap-2">
          {(["lb", "kg"] as const).map((option) => (
            <label
              key={option}
              className="
                cursor-pointer rounded-full border border-rule px-4 py-1.5
                font-cond text-xs font-semibold uppercase tracking-widest
                text-ink-muted transition-colors
                has-[:checked]:border-ink has-[:checked]:bg-ink
                has-[:checked]:text-ground
              "
            >
              <input
                type="radio"
                name="units"
                value={option}
                defaultChecked={units === option}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-3 text-xs text-ink-muted">
        Weights below are read in the unit selected here.
      </p>

      <NumberField
        id="goalWeight"
        name="goalWeight"
        label={`Goal weight (${units})`}
        defaultValue={goalWeight}
      />
      <NumberField
        id="startWeight"
        name="startWeight"
        label={`Start weight (${units})`}
        hint="Leave blank to use your earliest weigh-in."
        defaultValue={startWeight}
      />
      <NumberField
        id="heightInches"
        name="heightInches"
        label="Height (inches)"
        defaultValue={heightInches}
      />

      <div className="mt-7 border-t border-rule pt-5">
        <p className="eyebrow">Daily targets</p>
        <p className="mt-1 text-xs text-ink-muted">
          Drives your remaining-calorie budget, the progress bars, and what
          &ldquo;What can I eat?&rdquo; suggests. Left blank, those stay hidden
          rather than guessing a number for you.
        </p>

        <NumberField
          id="calorieTarget"
          name="calorieTarget"
          label="Calories"
          defaultValue={calorieTarget}
        />
        <NumberField
          id="proteinTargetG"
          name="proteinTargetG"
          label="Protein (g)"
          defaultValue={proteinTargetG}
        />
        <NumberField
          id="fiberTargetG"
          name="fiberTargetG"
          label="Fiber (g)"
          defaultValue={fiberTargetG}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="
          mt-6 w-full rounded-lg bg-ink px-4 py-3 font-cond text-sm font-semibold
          uppercase tracking-widest text-ground transition-opacity
          hover:opacity-90 disabled:opacity-40
        "
      >
        {pending ? "Saving" : "Save goal"}
      </button>

      <Status state={state} />
    </form>
  );
}

export function PinChangeForm() {
  const [state, formAction, pending] = useActionState(changePinAction, INITIAL);

  return (
    <form action={formAction} className="mt-4 rounded-xl border border-rule bg-surface p-5">
      <PinField id="currentPin" name="currentPin" label="Current PIN" />
      <PinField id="newPin" name="newPin" label="New PIN" />
      <PinField id="confirmPin" name="confirmPin" label="Confirm new PIN" />

      <button
        type="submit"
        disabled={pending}
        className="
          mt-6 w-full rounded-lg border border-ink px-4 py-3 font-cond text-sm
          font-semibold uppercase tracking-widest transition-colors
          hover:bg-surface-sunk disabled:opacity-40
        "
      >
        {pending ? "Updating" : "Change PIN"}
      </button>

      <Status state={state} />
    </form>
  );
}

function NumberField({
  id,
  name,
  label,
  hint,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue: number | null;
}) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={defaultValue === null ? "" : String(defaultValue)}
        placeholder="—"
        className="
          tnum mt-2 w-32 border-b border-rule bg-transparent pb-1 text-lg
          placeholder:text-ink-faint focus:border-trace focus:outline-none
        "
      />
    </div>
  );
}

function PinField({
  id,
  name,
  label,
}: {
  id: string;
  name: string;
  label: string;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern="\d*"
        autoComplete="off"
        className="
          tnum mt-2 w-40 border-b border-rule bg-transparent pb-1 text-lg
          tracking-[0.3em] focus:border-trace focus:outline-none
        "
      />
    </div>
  );
}

function Status({ state }: { state: SettingsResult }) {
  if (!state.error && !state.message) return null;
  return (
    <p
      role="status"
      className={`mt-3 text-sm ${state.error ? "text-up" : "text-ink-muted"}`}
    >
      {state.error ?? state.message}
    </p>
  );
}
