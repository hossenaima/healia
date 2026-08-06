"use client";

import { useRef, useState, useTransition } from "react";
import { importHealthRowsAction } from "@/app/actions/weight";
import { scanHealthExport, type HealthScan } from "@/lib/health-import";
import { formatDayShort } from "@/lib/dates";
import { fromLbs, type Units } from "@/lib/units";

type Phase =
  | { step: "idle" }
  | { step: "scanning"; bytes: number }
  | { step: "ready"; scan: HealthScan; sources: Set<string> }
  | { step: "done"; saved: number }
  | { step: "error"; message: string };

export function HealthImport({ units }: { units: Units }) {
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [saving, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setPhase({ step: "scanning", bytes: 0 });
    try {
      const scan = await scanHealthExport(file, (bytes) =>
        setPhase({ step: "scanning", bytes }),
      );
      if (scan.readings.length === 0) {
        setPhase({
          step: "error",
          message: "That export has no weight readings in it.",
        });
        return;
      }
      // Every source is on by default; the user unticks strays like a one-off
      // reading from an old app that would stretch the chart's axis.
      setPhase({
        step: "ready",
        scan,
        sources: new Set(Object.keys(scan.bySource)),
      });
    } catch (error) {
      setPhase({
        step: "error",
        message:
          error instanceof Error ? error.message : "Could not read that file.",
      });
    }
  }

  function toggleSource(source: string) {
    setPhase((current) => {
      if (current.step !== "ready") return current;
      const sources = new Set(current.sources);
      if (sources.has(source)) sources.delete(source);
      else sources.add(source);
      return { ...current, sources };
    });
  }

  const selected =
    phase.step === "ready"
      ? phase.scan.readings.filter((r) => phase.sources.has(r.source))
      : [];

  function save() {
    if (selected.length === 0) return;
    startSaving(async () => {
      const result = await importHealthRowsAction(
        selected.map(({ date, weightLbs }) => ({ date, weightLbs })),
      );
      setPhase(
        result.ok
          ? { step: "done", saved: result.saved ?? selected.length }
          : { step: "error", message: result.error ?? "Import failed." },
      );
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-rule bg-surface p-5">
      <p className="eyebrow">From Apple Health</p>
      <p className="mt-2 text-sm text-ink-muted">
        On your iPhone: Health → your profile picture → Export All Health Data.
        Drop the zip here. It is read on this device — only the weight readings
        are sent.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={phase.step === "scanning" || saving}
        className="btn btn-quiet mt-4 w-full"
      >
        {phase.step === "scanning" ? "Reading export" : "Choose export.zip"}
      </button>

      {phase.step === "scanning" && (
        <p className="tnum mt-3 text-sm text-ink-muted">
          {(phase.bytes / 1_000_000).toFixed(0)} MB scanned…
        </p>
      )}

      {phase.step === "ready" && (
        <div className="mt-4">
          <p className="text-sm">
            Found{" "}
            <span className="tnum font-medium">{phase.scan.readings.length}</span>{" "}
            daily readings. Choose which apps to import from:
          </p>

          <ul className="mt-3 space-y-2">
            {Object.entries(phase.scan.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <li key={source}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={phase.sources.has(source)}
                      onChange={() => toggleSource(source)}
                      className="size-4 accent-[var(--trace)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{source}</span>
                    <span className="tnum text-xs text-ink-muted">{count}</span>
                  </label>
                </li>
              ))}
          </ul>

          {selected.length > 0 && (
            <p className="tnum mt-3 text-xs text-ink-muted">
              {formatDayShort(selected[0].date)} →{" "}
              {formatDayShort(selected.at(-1)!.date)} ·{" "}
              {fromLbs(selected[0].weightLbs, units).toFixed(1)} to{" "}
              {fromLbs(selected.at(-1)!.weightLbs, units).toFixed(1)} {units}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving || selected.length === 0}
            className="btn btn-primary mt-4 w-full"
          >
            {saving ? "Importing" : `Import ${selected.length} weigh-ins`}
          </button>
        </div>
      )}

      {phase.step === "done" && (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          Imported {phase.saved} weigh-ins. They are on your weight page now.
        </p>
      )}

      {phase.step === "error" && (
        <p role="alert" className="mt-3 text-sm text-up">
          {phase.message}
        </p>
      )}
    </div>
  );
}
