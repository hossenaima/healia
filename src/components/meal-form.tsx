"use client";

import { useActionState, useState } from "react";
import { saveMealAction, type MealActionResult } from "@/app/actions/meals";
import { suggestMealName } from "@/lib/meals";

const INITIAL: MealActionResult = { ok: false };

export function MealForm({
  date,
  aiEnabled,
}: {
  date: string;
  /** False when no ANTHROPIC_API_KEY is configured. */
  aiEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveMealAction, INITIAL);
  const [name, setName] = useState(() => suggestMealName(new Date().getHours()));
  const [note, setNote] = useState("");
  const [showMacros, setShowMacros] = useState(false);
  const [portion, setPortion] = useState("1");

  // Which button was pressed decides whether the description goes to the
  // estimator; a hidden field carries that through the action.
  const [useAi, setUseAi] = useState("0");

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setNote("");
        setName(suggestMealName(new Date().getHours()));
        setPortion("1");
      }}
      className="card mt-4 p-5"
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="estimate" value={useAi} />

      <label htmlFor="name" className="eyebrow block">
        Meal
      </label>
      <input
        id="name"
        name="name"
        type="text"
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name it anything"
        className="
          mt-2 w-full border-b border-rule bg-transparent pb-1 text-lg
          placeholder:text-ink-faint focus:border-trace focus:outline-none
        "
      />

      <label htmlFor="note" className="eyebrow mt-5 block">
        What you ate
      </label>
      <textarea
        id="note"
        name="note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Two eggs, sourdough toast with butter, black coffee"
        className="
          mt-2 w-full rounded-lg bg-surface-sunk p-3 text-sm
          placeholder:text-ink-faint focus:outline-2 focus:outline-trace
        "
      />

      <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
        <div>
          <label htmlFor="calories" className="eyebrow block">
            Calories
          </label>
          <input
            id="calories"
            name="calories"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="—"
            className="
              tnum mt-1.5 w-24 border-b border-rule bg-transparent pb-1 text-lg
              placeholder:text-ink-faint focus:border-trace focus:outline-none
            "
          />
        </div>

        <button
          type="button"
          onClick={() => setShowMacros((v) => !v)}
          aria-expanded={showMacros}
          className="eyebrow pb-2 transition-colors hover:!text-ink"
        >
          {showMacros ? "− Macros" : "+ Macros"}
        </button>
      </div>

      {showMacros && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
          <GramField id="protein" label="Protein" tint="var(--protein)" />
          <GramField id="carbs" label="Carbs" tint="var(--carbs)" />
          <GramField id="fat" label="Fat" tint="var(--fat)" />
          <GramField id="fiber" label="Fiber" tint="var(--carbs)" />
          <GramField id="sodium" label="Sodium (mg)" tint="var(--fat)" />
        </div>
      )}

      <div className="mt-5 space-y-3 border-t border-rule pt-4">
        <div>
          <label htmlFor="portion" className="eyebrow block">
            How much of it you ate
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PORTIONS.map((p) => (
              <label
                key={p.value}
                className={`
                  cursor-pointer rounded-full px-3 py-1.5 font-cond text-xs
                  font-semibold uppercase tracking-widest transition-colors
                  ${
                    portion === p.value
                      ? "bg-ink text-ground"
                      : "bg-surface-sunk text-ink-muted hover:text-ink"
                  }
                `}
              >
                <input
                  type="radio"
                  name="portion"
                  value={p.value}
                  checked={portion === p.value}
                  onChange={() => setPortion(p.value)}
                  className="sr-only"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <Check
          name="brothLeft"
          label="Left the broth behind"
          hint="Takes 18% off — most of a soup's fat and sodium is in the liquid."
        />
        <Check
          name="exact"
          label="Read off a label"
          hint="Marks it exact instead of showing an estimate range."
        />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          onClick={() => setUseAi("0")}
          disabled={pending || note.trim() === "" || name.trim() === ""}
          className="
            flex-1 rounded-lg bg-surface-sunk px-4 py-3 font-cond text-sm
            font-semibold uppercase tracking-widest transition-opacity
            hover:opacity-80 disabled:opacity-40
          "
        >
          Save meal
        </button>

        <button
          type="submit"
          onClick={() => setUseAi("1")}
          disabled={
            pending || note.trim() === "" || name.trim() === "" || !aiEnabled
          }
          title={
            aiEnabled
              ? undefined
              : "Add ANTHROPIC_API_KEY to your environment to turn this on."
          }
          className="
            flex-1 rounded-lg bg-ink px-4 py-3 font-cond text-sm font-semibold
            uppercase tracking-widest text-ground transition-opacity
            hover:opacity-90 disabled:opacity-40
          "
        >
          {pending && useAi === "1" ? "Estimating" : "Estimate for me"}
        </button>
      </div>

      {!aiEnabled && (
        <p className="mt-3 text-xs text-ink-muted">
          Estimation is off. Add an Anthropic API key to your environment to turn
          it on.
        </p>
      )}

      <p
        role="status"
        className={`mt-3 text-sm ${state.error ? "text-up" : "text-ink-muted"}`}
      >
        {state.error ?? (state.ok ? (state.note ?? "Logged.") : "")}
      </p>
    </form>
  );
}

const PORTIONS = [
  { value: "1", label: "All" },
  { value: "0.5", label: "Half" },
  { value: "0.33", label: "A third" },
  { value: "0.25", label: "A quarter" },
  { value: "0.2", label: "A fifth" },
];

function Check({
  name,
  label,
  hint,
}: {
  name: string;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        className="mt-0.5 size-4 shrink-0 accent-[var(--trace)]"
      />
      <span>
        {label}
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function GramField({
  id,
  label,
  tint,
}: {
  id: string;
  label: string;
  tint: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow !flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: tint }}
        />
        {label} (g)
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="—"
        className="
          tnum mt-1.5 w-20 border-b border-rule bg-transparent pb-1 text-base
          placeholder:text-ink-faint focus:border-trace focus:outline-none
        "
      />
    </div>
  );
}
