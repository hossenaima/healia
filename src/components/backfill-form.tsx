"use client";

import { useActionState, useMemo, useState } from "react";
import { backfillAction, type ActionResult } from "@/app/actions/weight";
import { parseBackfillText } from "@/lib/backfill";
import { formatDayShort } from "@/lib/dates";
import type { Units } from "@/lib/units";

const INITIAL: ActionResult = { ok: false };

const PLACEHOLDER = `2026-01-04, 172.4
1/11/2026, 171.2
Jan 18 2026  170.8`;

export function BackfillForm({ units }: { units: Units }) {
  const [state, formAction, pending] = useActionState(backfillAction, INITIAL);
  const [text, setText] = useState("");

  // Parsed in the browser as you type, so mistakes surface before you submit.
  const preview = useMemo(() => parseBackfillText(text), [text]);

  return (
    <form action={formAction} className="mt-6">
      <label htmlFor="entries" className="eyebrow">
        One weigh-in per line
      </label>
      <p className="mt-1 text-sm text-ink-muted">
        Date first, then the weight in {units}. Commas, tabs, or spaces all work.
      </p>

      <textarea
        id="entries"
        name="entries"
        rows={10}
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        className="
          tnum mt-3 w-full rounded-xl border border-rule bg-surface p-4 text-sm
          leading-relaxed placeholder:text-ink-faint/60
          focus:border-trace focus:outline-none
        "
      />

      {text.trim() !== "" && (
        <div className="mt-3 rounded-lg border border-rule bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="tnum font-medium">{preview.rows.length}</span>{" "}
            {preview.rows.length === 1 ? "entry" : "entries"} ready
            {preview.errors.length > 0 && (
              <>
                {" · "}
                <span className="text-up">
                  {preview.errors.length} line
                  {preview.errors.length === 1 ? "" : "s"} unreadable
                </span>
              </>
            )}
          </p>

          {preview.rows.length > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              {formatDayShort(preview.rows[0].date)}
              {preview.rows.length > 1 && (
                <> → {formatDayShort(preview.rows.at(-1)!.date)}</>
              )}
            </p>
          )}

          {preview.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
              {preview.errors.slice(0, 4).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || preview.rows.length === 0}
        className="
          mt-5 w-full rounded-lg bg-ink px-4 py-3 font-cond text-sm font-semibold
          uppercase tracking-widest text-ground transition-opacity
          hover:opacity-90 disabled:opacity-40
        "
      >
        {pending ? "Importing" : `Import ${preview.rows.length || ""} entries`}
      </button>

      <p
        role="status"
        className={`mt-3 text-sm ${state.error ? "text-up" : "text-ink-muted"}`}
      >
        {state.ok
          ? `Imported ${state.saved} entries.${state.error ? ` ${state.error}` : ""}`
          : (state.error ?? "")}
      </p>
    </form>
  );
}
