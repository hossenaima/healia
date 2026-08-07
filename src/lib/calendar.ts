import { addDays, dayKeyToDate } from "@/lib/dates";

/** "YYYY-MM" for the month a day belongs to. */
export function monthKey(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/**
 * The month laid out as weeks starting Monday, padded with nulls so the grid
 * keeps its shape. Monday-first because a week of habit reads Mon→Sun.
 */
export function monthGrid(month: string): Array<Array<string | null>> {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  // getUTCDay is Sunday-based; shift so Monday is 0.
  const lead = (first.getUTCDay() + 6) % 7;

  const cells: Array<string | null> = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<string | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Consecutive days ending today (or yesterday — a streak should survive until
 * the day is actually over, otherwise it reads as broken every morning before
 * you step on the scale).
 */
export function weighInStreak(
  dates: string[],
  today: string,
): { current: number; best: number } {
  const set = new Set(dates);

  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  // Only forgive the missing day if yesterday was logged; otherwise the streak
  // really is zero.
  if (!set.has(cursor)) {
    current = 0;
  } else {
    while (set.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }

  let best = 0;
  let run = 0;
  const sorted = [...set].sort();
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1;
    best = Math.max(best, run);
  }

  return { current, best: Math.max(best, current) };
}

/** The seven days ending on `day`, oldest first — for the week strip. */
export function weekEnding(day: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(day, i - 6));
}

export { dayKeyToDate };

/** Milestones land every five pounds. Close enough together to arrive while
 *  the effort is still fresh, far enough apart to still mean something. */
export const MILESTONE_STEP_LBS = 5;

export type Milestone =
  | { kind: "goal" }
  | { kind: "lost"; lbs: number }
  | null;

/**
 * The milestone worth congratulating right now, or null.
 *
 * `alreadyShown` is the largest one already acknowledged, so crossing back and
 * forth over the same five pounds does not congratulate you twice — and a long
 * gap in logging that skips several at once reports the one actually reached
 * rather than a queue of them.
 */
export function milestoneReached({
  startLbs,
  currentLbs,
  goalLbs,
  alreadyShown,
}: {
  startLbs: number | null;
  currentLbs: number | null;
  goalLbs: number | null;
  alreadyShown: number;
}): Milestone {
  if (currentLbs === null) return null;

  if (goalLbs !== null && currentLbs <= goalLbs) {
    // The goal is the last milestone; anything past it is still the goal.
    return alreadyShown >= Number.MAX_SAFE_INTEGER ? null : { kind: "goal" };
  }

  if (startLbs === null) return null;
  const lost = startLbs - currentLbs;
  if (lost < MILESTONE_STEP_LBS) return null;

  const reached = Math.floor(lost / MILESTONE_STEP_LBS) * MILESTONE_STEP_LBS;
  return reached > alreadyShown ? { kind: "lost", lbs: reached } : null;
}
