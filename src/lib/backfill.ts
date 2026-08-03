import { isDayKey } from "@/lib/dates";

export type ParsedRow = { date: string; weight: number };

/**
 * Accepts the shapes people actually paste out of a weight app: one entry per
 * line, date and weight separated by a comma, tab, or run of spaces.
 * Examples: "2026-01-04, 172.4"  "01/04/2026  172.4"  "Jan 4 2026 172.4"
 */
export function parseBackfillText(text: string): {
  rows: ParsedRow[];
  errors: string[];
} {
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const [i, line] of lines.entries()) {
    const lineNo = i + 1;

    // Weight is the last number on the line; everything before it is the date.
    const match = line.match(/^(.*?)[\s,\t]+([\d.]+)\s*(?:lbs?|kg)?$/i);
    if (!match) {
      errors.push(`Line ${lineNo}: could not read "${line}".`);
      continue;
    }

    const [, rawDate, rawWeight] = match;
    const weight = Number(rawWeight);
    if (!Number.isFinite(weight) || weight <= 0) {
      errors.push(`Line ${lineNo}: "${rawWeight}" is not a weight.`);
      continue;
    }

    const date = normalizeDate(rawDate.trim().replace(/,+$/, ""));
    if (!date) {
      errors.push(`Line ${lineNo}: could not read the date "${rawDate.trim()}".`);
      continue;
    }

    // A later line for the same day wins, matching "re-weighing corrects it".
    if (seen.has(date)) {
      const existing = rows.findIndex((r) => r.date === date);
      rows[existing] = { date, weight };
    } else {
      seen.add(date);
      rows.push({ date, weight });
    }
  }

  return { rows, errors };
}

function normalizeDate(raw: string): string | null {
  if (isDayKey(raw)) return raw;

  // M/D/YYYY and M-D-YYYY, the US shapes a spreadsheet export produces.
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y.length === 2 ? `20${y}` : y;
    const candidate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isDayKey(candidate) ? candidate : null;
  }

  // Fall back to Date parsing for "Jan 4 2026" style text. Parsed at UTC noon
  // so a timezone offset can never shift it to the previous day.
  const parsed = new Date(`${raw} 12:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
