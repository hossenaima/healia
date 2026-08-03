"use client";

import { useActionState, useRef, useState } from "react";
import { saveMealAction, type MealActionResult } from "@/app/actions/meals";
import { MEAL_SLOTS, SLOT_LABELS, slotForHour } from "@/lib/meals";

const INITIAL: MealActionResult = { ok: false };

export function MealForm({
  date,
  aiEnabled,
}: {
  date: string;
  /** False when no OPENAI_API_KEY is configured. */
  aiEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveMealAction, INITIAL);
  const [slot, setSlot] = useState<string>(slotForHour(new Date().getHours()));
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Which button was pressed decides whether the description goes to the
  // estimator; a hidden field carries that through the action.
  const [useAi, setUseAi] = useState("0");

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        setNote("");
      }}
      className="mt-5 rounded-xl border border-rule bg-surface p-5"
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="estimate" value={useAi} />

      <fieldset>
        <legend className="eyebrow">Meal</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEAL_SLOTS.map((option) => (
            <label
              key={option}
              className={`
                cursor-pointer rounded-full border px-3 py-1.5 font-cond text-xs
                font-semibold uppercase tracking-widest transition-colors
                ${
                  slot === option
                    ? "border-ink bg-ink text-ground"
                    : "border-rule text-ink-muted hover:border-ink-faint"
                }
              `}
            >
              <input
                type="radio"
                name="slot"
                value={option}
                checked={slot === option}
                onChange={() => setSlot(option)}
                className="sr-only"
              />
              {SLOT_LABELS[option]}

            </label>
          ))}
        </div>
      </fieldset>

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
          mt-2 w-full rounded-lg border border-rule bg-transparent p-3 text-sm
          placeholder:text-ink-faint focus:border-trace focus:outline-none
        "
      />

      <label htmlFor="calories" className="eyebrow mt-4 block">
        Calories (optional)
      </label>
      <input
        id="calories"
        name="calories"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="—"
        className="
          tnum mt-2 w-32 border-b border-rule bg-transparent pb-1 text-lg
          placeholder:text-ink-faint focus:border-trace focus:outline-none
        "
      />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          onClick={() => setUseAi("0")}
          disabled={pending || note.trim() === ""}
          className="
            flex-1 rounded-lg border border-ink px-4 py-3 font-cond text-sm
            font-semibold uppercase tracking-widest transition-colors
            hover:bg-surface-sunk disabled:opacity-40
          "
        >
          Save meal
        </button>

        <button
          type="submit"
          onClick={() => setUseAi("1")}
          disabled={pending || note.trim() === "" || !aiEnabled}
          title={
            aiEnabled
              ? undefined
              : "Add OPENAI_API_KEY to your environment to turn this on."
          }
          className="
            flex-1 rounded-lg bg-ink px-4 py-3 font-cond text-sm font-semibold
            uppercase tracking-widest text-ground transition-opacity
            hover:opacity-90 disabled:opacity-40
          "
        >
          {pending && useAi === "1" ? "Estimating" : "Estimate calories"}
        </button>
      </div>

      {!aiEnabled && (
        <p className="mt-3 text-xs text-ink-muted">
          Calorie estimation is off. Add an OpenAI API key to your environment to
          turn it on.
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
