/**
 * Shared vocabulary for the suggestion feature. Kept free of `server-only` so
 * the form component can label its own controls without dragging the Anthropic
 * SDK into the browser bundle.
 */

export const SATIETY_GOALS = [
  "high_protein",
  "high_fiber",
  "low_density",
] as const;
export type SatietyGoal = (typeof SATIETY_GOALS)[number];

export const SATIETY_LABELS: Record<SatietyGoal, string> = {
  high_protein: "High protein",
  high_fiber: "High fiber",
  low_density: "Low calorie density",
};

export const LOCATIONS = ["home", "out"] as const;
export type Location = (typeof LOCATIONS)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  home: "At home",
  out: "Grab & go",
};

export type Suggestion = {
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  satietyNote: string;
  usesOnHand: string[];
};
