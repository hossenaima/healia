"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isDayKey } from "@/lib/dates";
import {
  EstimatorUnavailableError,
  getEstimator,
  type EstimatedItem,
} from "@/lib/ai/estimator";
import { MEAL_SLOTS } from "@/lib/meals";

export type MealActionResult = {
  ok: boolean;
  error?: string;
  note?: string;
};

const mealSchema = z.object({
  date: z.string().refine(isDayKey, "Not a valid date."),
  slot: z.enum(MEAL_SLOTS),
  note: z.string().trim().min(1, "Describe what you ate.").max(2000),
});

/**
 * Saves a meal. When `estimate` is set the description is sent to the estimator
 * and the returned items are stored; otherwise the meal is saved with whatever
 * calorie figure the user typed.
 */
export async function saveMealAction(
  _prev: MealActionResult,
  formData: FormData,
): Promise<MealActionResult> {
  await requireAuth();

  const parsed = mealSchema.safeParse({
    date: formData.get("date"),
    slot: formData.get("slot"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { date, slot, note } = parsed.data;
  const useAi = formData.get("estimate") === "1";
  const manualCalories = formData.get("calories");

  let items: EstimatedItem[] = [];
  let aiNote: string | undefined;

  if (useAi) {
    try {
      const result = await getEstimator().estimate(note);
      items = result.items;
      aiNote = result.note;
      if (items.length === 0) {
        return {
          ok: false,
          error: aiNote ?? "Could not identify any food in that description.",
        };
      }
    } catch (error) {
      if (error instanceof EstimatorUnavailableError) {
        return { ok: false, error: error.message };
      }
      return {
        ok: false,
        error:
          "Estimation failed. Save it with a calorie number instead, or try again.",
      };
    }
  } else {
    const calories = Number(manualCalories);
    if (manualCalories !== null && String(manualCalories).trim() !== "") {
      if (!Number.isFinite(calories) || calories < 0) {
        return { ok: false, error: "Calories must be a number." };
      }
      items = [
        {
          name: note.slice(0, 200),
          quantity: null,
          calories: Math.round(calories),
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
      ];
    }
  }

  await prisma.meal.create({
    data: {
      date,
      slot,
      note,
      items: {
        create: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          source: useAi ? "ai" : "manual",
        })),
      },
    },
  });

  revalidatePath("/meals");
  return { ok: true, note: aiNote };
}

export async function deleteMealAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.meal.delete({ where: { id } }).catch(() => {
    // Already deleted from another tab — nothing to do.
  });

  revalidatePath("/meals");
}

export async function deleteMealItemAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("itemId") ?? "");
  if (!id) return;

  await prisma.mealItem.delete({ where: { id } }).catch(() => {});
  revalidatePath("/meals");
}
