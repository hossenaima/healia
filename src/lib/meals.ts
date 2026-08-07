export type Macros = { proteinG: number; carbsG: number; fatG: number };

/**
 * A starting name based on the clock, so the common case needs no typing.
 * It is only a suggestion — the field is free text and a day can hold any
 * number of meals with any names.
 */
export function suggestMealName(hour: number): string {
  if (hour < 11) return "Breakfast";
  if (hour < 16) return "Lunch";
  if (hour < 21) return "Dinner";
  return "Snack";
}

export function macroEnergyShares(macros: Macros) {
  const protein = macros.proteinG * 4;
  const carbs = macros.carbsG * 4;
  const fat = macros.fatG * 9;
  const total = protein + carbs + fat;
  if (total <= 0) return null;
  return {
    protein: (protein / total) * 100,
    carbs: (carbs / total) * 100,
    fat: (fat / total) * 100,
  };
}

export type RepeatableMeal = {
  id: string;
  name: string;
  note: string;
  calories: number;
  itemCount: number;
  lastLogged: string;
};

/**
 * Meals worth offering again.
 *
 * There is no separate "saved meals" table: a meal that has been logged once
 * already holds its description and its priced-out items, so logging it again
 * is a copy. That is the whole point — the estimate has been paid for, and
 * the same breakfast should never cost a second call to the model.
 *
 * Deduplicated by name, keeping the most recent, because the useful list is
 * "things I eat", not "every time I ate them".
 */
export function repeatableMeals(
  meals: Array<{
    id: string;
    name: string;
    note: string;
    date: string;
    items: Array<{ calories: number | null }>;
  }>,
  limit = 8,
): RepeatableMeal[] {
  const byName = new Map<string, RepeatableMeal>();

  // Callers pass these newest-first, so the first sighting of a name wins.
  for (const meal of meals) {
    const key = meal.name.trim().toLowerCase();
    if (!key || byName.has(key)) continue;
    // Nothing to reuse from a meal with no priced items.
    if (meal.items.length === 0) continue;

    byName.set(key, {
      id: meal.id,
      name: meal.name,
      note: meal.note,
      calories: meal.items.reduce((sum, i) => sum + (i.calories ?? 0), 0),
      itemCount: meal.items.length,
      lastLogged: meal.date,
    });
    if (byName.size >= limit) break;
  }

  return [...byName.values()];
}
