/**
 * Everything the app knows about turning logged items into figures on screen.
 *
 * Adjustments (portion share, broth left behind) are applied here at read time
 * rather than written into the stored estimate, so correcting a share later
 * does not require re-estimating the food.
 */

export type Nutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
};

export type ItemLike = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  precision?: string;
};

export type MealLike = {
  portion: number;
  brothLeft: boolean;
  items: ItemLike[];
};

export const ZERO: Nutrition = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sodiumMg: 0,
};

/**
 * Broth carries much of a soup's fat and most of its sodium while contributing
 * little of what you actually swallow, so leaving it takes a meaningful bite
 * out of the total. 18% sits in the middle of the 15–20% range that shows up
 * in ramen and pho nutrition breakdowns; it is a rule of thumb, not a
 * measurement, which is why such a meal always reads as estimated.
 */
export const BROTH_LEFT_FACTOR = 0.82;
/** Sodium is cut harder than calories — most of it is dissolved in the broth. */
const BROTH_SODIUM_FACTOR = 0.5;

/** A day is flagged when a single sitting crosses these. */
export const HIGH_SODIUM_MG = 1500;
export const HIGH_FIBER_G = 10;

/** Restaurant portions vary enough that a point estimate overstates certainty. */
export const ESTIMATE_RANGE = 0.15;

export function mealNutrition(meal: MealLike): Nutrition {
  const scale = meal.portion * (meal.brothLeft ? BROTH_LEFT_FACTOR : 1);
  const sodiumScale =
    meal.portion * (meal.brothLeft ? BROTH_SODIUM_FACTOR : 1);

  return meal.items.reduce<Nutrition>(
    (total, item) => ({
      calories: total.calories + (item.calories ?? 0) * scale,
      proteinG: total.proteinG + (item.proteinG ?? 0) * scale,
      carbsG: total.carbsG + (item.carbsG ?? 0) * scale,
      fatG: total.fatG + (item.fatG ?? 0) * scale,
      fiberG: total.fiberG + (item.fiberG ?? 0) * scale,
      sodiumMg: total.sodiumMg + (item.sodiumMg ?? 0) * sodiumScale,
    }),
    { ...ZERO },
  );
}

export function sumNutrition(parts: Nutrition[]): Nutrition {
  return parts.reduce<Nutrition>(
    (total, part) => ({
      calories: total.calories + part.calories,
      proteinG: total.proteinG + part.proteinG,
      carbsG: total.carbsG + part.carbsG,
      fatG: total.fatG + part.fatG,
      fiberG: total.fiberG + part.fiberG,
      sodiumMg: total.sodiumMg + part.sodiumMg,
    }),
    { ...ZERO },
  );
}

/** A meal reads as exact only when every item in it does. */
export function mealPrecision(meal: MealLike): "exact" | "estimated" {
  if (meal.items.length === 0) return "estimated";
  // A partial share or a half-drunk bowl is a judgement call regardless of how
  // well the underlying item is known.
  if (meal.portion !== 1 || meal.brothLeft) return "estimated";
  return meal.items.every((i) => i.precision === "exact")
    ? "exact"
    : "estimated";
}

/** ± band to show beside an estimated figure. */
export function estimateBand(calories: number) {
  const margin = Math.round(calories * ESTIMATE_RANGE);
  return { low: Math.max(0, Math.round(calories) - margin), high: Math.round(calories) + margin, margin };
}

export type DayTag = "high_sodium" | "high_volume";

/**
 * Which meals in the window crossed a flag, and when. The date matters: the
 * banner names the meal it is blaming, and guessing "yesterday" is wrong as
 * often as not — a late dinner is logged on the same day as the morning
 * weigh-in that follows it.
 */
export function flaggedMeals<T extends MealLike & { date: string }>(
  meals: T[],
): Array<{ date: string; tags: DayTag[] }> {
  const flagged: Array<{ date: string; tags: DayTag[] }> = [];
  for (const meal of meals) {
    const n = mealNutrition(meal);
    const tags: DayTag[] = [];
    if (n.sodiumMg >= HIGH_SODIUM_MG) tags.push("high_sodium");
    if (n.fiberG >= HIGH_FIBER_G) tags.push("high_volume");
    if (tags.length) flagged.push({ date: meal.date, tags });
  }
  return flagged;
}

export function dayTags(meals: MealLike[]): DayTag[] {
  const tags: DayTag[] = [];
  // Per sitting, not per day: one salty dinner is what moves the scale
  // overnight, and it would be washed out by a daily average.
  for (const meal of meals) {
    const n = mealNutrition(meal);
    if (n.sodiumMg >= HIGH_SODIUM_MG && !tags.includes("high_sodium")) {
      tags.push("high_sodium");
    }
    if (n.fiberG >= HIGH_FIBER_G && !tags.includes("high_volume")) {
      tags.push("high_volume");
    }
  }
  return tags;
}

/** Remaining budget: target − eaten + burned. Null when no target is set. */
export function remainingCalories(
  target: number | null,
  consumed: number,
  activeBurn: number | null,
): number | null {
  if (target === null) return null;
  return Math.round(target - consumed + (activeBurn ?? 0));
}

/**
 * Trailing mean over `window` days, aligned to each day in `days`. Days with
 * nothing logged are skipped rather than counted as zero — a day you forgot to
 * log is missing data, not a fast.
 */
export function rollingAverage(
  days: Array<{ date: string; value: number | null }>,
  window: number,
): Array<{ date: string; average: number | null }> {
  return days.map((day, i) => {
    const slice = days.slice(Math.max(0, i - window + 1), i + 1);
    const values = slice
      .map((d) => d.value)
      .filter((v): v is number => v !== null);
    return {
      date: day.date,
      average: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
    };
  });
}
