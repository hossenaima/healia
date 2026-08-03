"use client";

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

/**
 * The signature view: the trace descends toward the goal horizon, and the tinted
 * band between them is the distance still to go — it literally shrinks as the
 * line approaches. One series, so no legend; the heading names it.
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
  const data = points.map((p) => ({
    date: p.date,
    t: dayKeyToDate(p.date).getTime(),
    weight: round1(fromLbs(p.weightLbs, units)),
  }));

  const goal = goalLbs === null ? null : round1(fromLbs(goalLbs, units));

  const weights = data.map((d) => d.weight);
  const lo = Math.min(...weights, goal ?? Infinity);
  const hi = Math.max(...weights, goal ?? -Infinity);
  // A flat-looking line is the honest picture of a flat week, so pad by a fixed
  // minimum rather than letting the axis zoom into noise.
  const pad = Math.max((hi - lo) * 0.18, 1.5);

  // The tinted band is drawn from the goal upward; with no goal set, fall back
  // to the axis floor so the area still reads as "weight above the baseline".
  const base = goal ?? lo - pad;

  return (
    <figure className="mt-4">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="traceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--trace)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--trace)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--rule)"
            strokeWidth={1}
            vertical={false}
          />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              new Date(t).toLocaleDateString("en-US", {
                timeZone: "UTC",
                month: "short",
                day: "numeric",
              })
            }
            tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            minTickGap={36}
          />

          <YAxis
            domain={[lo - pad, hi + pad]}
            tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => v.toFixed(0)}
          />

          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke="var(--goal)"
              strokeWidth={2}
              strokeDasharray="5 4"
              label={{
                value: `Goal ${goal.toFixed(1)} ${units}`,
                position: "insideBottomRight",
                fill: "var(--goal)",
                fontSize: 11,
              }}
            />
          )}

          <Tooltip
            cursor={{ stroke: "var(--ink-faint)", strokeWidth: 1 }}
            content={<ReadingTooltip units={units} goal={goal} />}
          />

          <Area
            type="monotone"
            dataKey="weight"
            baseValue={base}
            stroke="var(--trace)"
            strokeWidth={2}
            fill="url(#traceFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--trace)",
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded-full bg-trace"
          />
          Morning weight
        </span>
        {goal !== null && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-full bg-goal"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--goal) 0 5px, transparent 5px 9px)",
                backgroundColor: "transparent",
              }}
            />
            Goal
          </span>
        )}
      </figcaption>
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
    <div className="rounded-md border border-rule bg-surface px-3 py-2 shadow-sm">
      <p className="eyebrow !text-ink-muted">{formatDayShort(point.date)}</p>
      <p className="tnum mt-0.5 text-base font-medium">
        {point.weight.toFixed(1)} {units}
      </p>
      {toGo !== null && (
        <p className="tnum mt-0.5 text-xs text-ink-muted">
          {toGo > 0
            ? `${toGo.toFixed(1)} ${units} to goal`
            : "at or past goal"}
        </p>
      )}
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
