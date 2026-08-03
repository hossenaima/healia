"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dayKeyToDate, formatDayShort } from "@/lib/dates";
import { fromLbs, type Units } from "@/lib/units";

export type ChartPoint = { date: string; weightLbs: number };

const RANGES = [
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "all", label: "All", days: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/**
 * The signature view: the trace descends toward the goal horizon, and the
 * tinted band between them is the distance still to go.
 *
 * Defaults to the last 30 days. A year of history compressed into 300px turns
 * every real week into a wiggle, and the question this chart answers is "how is
 * it going lately", not "what happened in March".
 */
export function WeightChart({
  points,
  goalLbs,
  units,
}: {
  points: ChartPoint[];
  goalLbs: number | null;
  units: Units;
}) {
  const [range, setRange] = useState<RangeKey>("30");

  const all = useMemo(
    () =>
      points.map((p) => ({
        date: p.date,
        t: dayKeyToDate(p.date).getTime(),
        weight: round1(fromLbs(p.weightLbs, units)),
      })),
    [points, units],
  );

  const goal = goalLbs === null ? null : round1(fromLbs(goalLbs, units));

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    if (!Number.isFinite(days) || all.length === 0) return all;
    const cutoff = all[all.length - 1].t - days * 86_400_000;
    const windowed = all.filter((d) => d.t >= cutoff);
    // Never render a single lonely point — fall back to the whole history.
    return windowed.length >= 2 ? windowed : all;
  }, [all, range]);

  const weights = data.map((d) => d.weight);
  const lo = weights.length ? Math.min(...weights) : (goal ?? 150) - 5;
  const hi = weights.length ? Math.max(...weights) : (goal ?? 150) + 5;

  // The axis is scaled to the weights, not to the goal. Forcing a far-off goal
  // into the domain squashes the trace into a corner and hides the day-to-day
  // movement that is the whole point of looking. The goal line is drawn only
  // when it is close enough to share the frame; otherwise it is stated as text.
  const spread = Math.max(hi - lo, 2);
  const pad = spread * 0.25;
  const domainLo = lo - pad;
  const domainHi = hi + pad;
  const goalInFrame =
    goal !== null && goal >= domainLo - spread * 0.6 && goal <= domainHi;

  const floor = goalInFrame ? Math.min(domainLo, goal - pad * 0.5) : domainLo;
  const base = goalInFrame ? goal : floor;

  const empty = data.length === 0;

  return (
    <figure className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-full bg-trace"
            />
            Morning weight
          </span>
          {goalInFrame && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-4"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--goal) 0 5px, transparent 5px 9px)",
                }}
              />
              Goal
            </span>
          )}
        </figcaption>

        <div
          role="group"
          aria-label="Time range"
          className="flex shrink-0 gap-0.5 rounded-lg bg-surface-sunk p-0.5"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`
                rounded-[0.3rem] px-2.5 py-1 font-cond text-[0.7rem] font-semibold
                uppercase tracking-wider transition-colors
                ${
                  range === r.key
                    ? "bg-surface text-ink shadow-[var(--lift-sm)]"
                    : "text-ink-faint hover:text-ink-muted"
                }
              `}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="traceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--trace)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--trace)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--rule)" strokeWidth={1} vertical={false} />

            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={empty ? [0, 1] : ["dataMin", "dataMax"]}
              tickFormatter={(t) =>
                empty
                  ? ""
                  : new Date(t).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                      month: "short",
                      day: "numeric",
                    })
              }
              tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
              axisLine={{ stroke: "var(--rule)" }}
              tickLine={false}
              minTickGap={40}
            />

            <YAxis
              domain={[floor, domainHi]}
              tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={46}
              tickFormatter={(v: number) => v.toFixed(0)}
            />

            {goalInFrame && (
              <ReferenceLine
                y={goal}
                stroke="var(--goal)"
                strokeWidth={2}
                strokeDasharray="5 4"
                label={{
                  value: `Goal ${goal!.toFixed(1)}`,
                  position: "insideBottomRight",
                  fill: "var(--goal)",
                  fontSize: 11,
                }}
              />
            )}

            {!empty && (
              <Tooltip
                cursor={{ stroke: "var(--ink-faint)", strokeWidth: 1 }}
                content={<ReadingTooltip units={units} goal={goal} />}
              />
            )}

            <Area
              type="monotone"
              dataKey="weight"
              baseValue={base}
              stroke="var(--trace)"
              strokeWidth={2}
              fill="url(#traceFill)"
              isAnimationActive={false}
              dot={data.length <= 14 ? { r: 2.5, fill: "var(--trace)" } : false}
              activeDot={{
                r: 5,
                fill: "var(--trace)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-ink-faint">
            Your line starts with
            <br />
            this morning&rsquo;s weigh-in.
          </p>
        )}
      </div>

      {goal !== null && !goalInFrame && !empty && (
        <p className="mt-1 text-xs text-ink-muted">
          Goal is {goal.toFixed(1)} {units} — below this view, so the line stays
          readable.
        </p>
      )}
    </figure>
  );
}

function ReadingTooltip({
  active,
  payload,
  units,
  goal,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; weight: number } }>;
  units: Units;
  goal: number | null;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const toGo = goal === null ? null : point.weight - goal;

  return (
    <div className="rounded-lg bg-surface px-3 py-2 shadow-[var(--lift)]">
      <p className="eyebrow !text-ink-muted">{formatDayShort(point.date)}</p>
      <p className="tnum mt-0.5 text-base font-medium">
        {point.weight.toFixed(1)} {units}
      </p>
      {toGo !== null && (
        <p className="tnum mt-0.5 text-xs text-ink-muted">
          {toGo > 0 ? `${toGo.toFixed(1)} ${units} to goal` : "at or past goal"}
        </p>
      )}
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
