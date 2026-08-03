"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serverToday } from "@/lib/dates";
import { mealNutrition, remainingCalories, sumNutrition } from "@/lib/nutrition";
import { SuggesterUnavailableError, getSuggester } from "@/lib/ai/suggester";
import { LOCATIONS, SATIETY_GOALS, type Suggestion } from "@/lib/eat";

export type SuggestResult = {
  ok: boolean;
  error?: string;
  note?: string;
  remaining?: number;
  suggestions?: Suggestion[];
};

const schema = z.object({
  satiety: z.enum(SATIETY_GOALS),
  location: z.enum(LOCATIONS),
  ingredients: z.string().max(500).optional(),
});

export async function suggestMealsAction(
  _prev: SuggestResult,
  formData: FormData,
): Promise<SuggestResult> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    satiety: formData.get("satiety"),
    location: formData.get("location"),
    ingredients: formData.get("ingredients") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  if (user.calorieTarget === null) {
    return {
      ok: false,
      error: "Set a daily calorie target in Settings first — suggestions are built around what you have left.",
    };
  }

  // Recomputed here rather than trusted from the client: the budget is the one
  // number every suggestion is checked against.
  const date = serverToday();
  const [meals, dayLog] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, date },
      include: { items: true },
    }),
    prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    }),
  ]);

  const eaten = sumNutrition(meals.map(mealNutrition));
  const remaining = remainingCalories(
    user.calorieTarget,
    eaten.calories,
    dayLog?.activeBurnKcal ?? null,
  );

  if (remaining === null) {
    return { ok: false, error: "No calorie target set." };
  }
  if (remaining < 50) {
    return {
      ok: false,
      remaining,
      error:
        remaining <= 0
          ? "You are already at your target for today. Nothing to suggest."
          : "Under 50 calories left today — not enough for a meal worth suggesting.",
    };
  }

  const ingredients = (parsed.data.ingredients ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  try {
    const result = await getSuggester().suggest({
      remainingCalories: remaining,
      satiety: parsed.data.satiety,
      location: parsed.data.location,
      ingredientsOnHand: ingredients,
      proteinLeftG: leftToGo(user.proteinTargetG, eaten.proteinG),
      fiberLeftG: leftToGo(user.fiberTargetG, eaten.fiberG),
    });

    if (result.suggestions.length === 0) {
      return {
        ok: false,
        remaining,
        error:
          result.note ??
          "Nothing fit inside your remaining calories. Try a different filter.",
      };
    }

    return { ok: true, remaining, ...result };
  } catch (error) {
    if (error instanceof SuggesterUnavailableError) {
      return { ok: false, remaining, error: error.message };
    }
    return {
      ok: false,
      remaining,
      error: "Could not get suggestions just now. Try again.",
    };
  }
}

function leftToGo(target: number | null, eaten: number): number | null {
  if (target === null) return null;
  return Math.max(0, Math.round(target - eaten));
}
