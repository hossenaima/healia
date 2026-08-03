export type Units = "lb" | "kg";

const LB_PER_KG = 2.2046226218;

/** Convert a stored weight (always lbs) into the user's display unit. */
export function fromLbs(lbs: number, units: Units): number {
  return units === "kg" ? lbs / LB_PER_KG : lbs;
}

/** Convert a weight the user typed in their display unit back to lbs. */
export function toLbs(value: number, units: Units): number {
  return units === "kg" ? value * LB_PER_KG : value;
}

export function formatWeight(lbs: number, units: Units, digits = 1): string {
  return `${fromLbs(lbs, units).toFixed(digits)} ${units}`;
}

/**
 * Magnitude of a change, without a sign — callers pair it with an arrow so
 * direction is stated once rather than twice ("↓ 0.2 lb", not "↓ −0.2 lb").
 */
export function formatDelta(deltaLbs: number, units: Units, digits = 1): string {
  return `${Math.abs(fromLbs(deltaLbs, units)).toFixed(digits)} ${units}`;
}
