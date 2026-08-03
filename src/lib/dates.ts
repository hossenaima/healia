/**
 * Day keys are "YYYY-MM-DD" in the *user's* timezone.
 *
 * The server may well run in UTC while the user logs a late-night meal, which
 * would otherwise file it under tomorrow. Server-side code resolves "today"
 * through APP_TIMEZONE; client-side code uses the browser's actual timezone.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: string): boolean {
  if (!DAY_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // Reject impossible dates like 2026-02-31 that the regex alone would accept.
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/** "YYYY-MM-DD" for `date` as seen in `timeZone`. */
export function dayKeyIn(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we store.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's day key on the server, per APP_TIMEZONE. */
export function serverToday(): string {
  return dayKeyIn(new Date(), APP_TIMEZONE);
}

/** Today's day key in the browser's local timezone. */
export function clientToday(): string {
  return dayKeyIn(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Parse a day key into a Date at UTC midnight — safe for arithmetic and charts. */
export function dayKeyToDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, delta: number): string {
  const date = dayKeyToDate(day);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Whole days between two day keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = dayKeyToDate(b).getTime() - dayKeyToDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** "Sat, Aug 2" — compact label for lists and chart axes. */
export function formatDayShort(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dayKeyToDate(day));
}

export function formatDayLong(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dayKeyToDate(day));
}
