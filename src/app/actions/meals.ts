"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isDayKey } from "@/lib/dates";
import {
  EstimatorUnavailableError,
  getEstimator,
  type EstimatedItem,
} from "@/lib/ai/estimator";

export type MealActionResult = {
  ok: boolean;
  error?: string;
  note?: string;
};

const mealSchema = z.object({
  date: z.string().refine(isDayKey, "Not a valid date."),
  name: z.string().trim().min(1, "Give the meal a name.").max(60),
  note: z.string().trim().min(1, "Describe what you ate.").max(2000),
  portion: z.coerce
    .number()
    .gt(0, "Portion must be more than zero.")
    .max(1, "Portion is the share you ate, so at most 1."),
  brothLeft: z.boolean(),
});

/**
 * Saves a meal. A day holds as many meals as the user logs — there is no fixed
 * set of slots, so this always creates rather than replacing anything.
 */
export async function saveMealAction(
  _prev: MealActionResult,
  formData: FormData,
): Promise<MealActionResult> {
  const user = await requireUser();

  const parsed = mealSchema.safeParse({
    date: formData.get("date"),
    name: formData.get("name"),
    note: formData.get("note"),
    portion: formData.get("portion") || 1,
    brothLeft: formData.get("brothLeft") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { date, name, note, portion, brothLeft } = parsed.data;
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
  } else if (manualCalories !== null && String(manualCalories).trim() !== "") {
    const calories = Number(manualCalories);
    if (!Number.isFinite(calories) || calories < 0) {
      return { ok: false, error: "Calories must be a number." };
    }
    items = [
      {
        name: note.slice(0, 200),
        quantity: null,
        calories: Math.round(calories),
        proteinG: optionalGrams(formData.get("protein")),
        carbsG: optionalGrams(formData.get("carbs")),
        fatG: optionalGrams(formData.get("fat")),
        fiberG: optionalGrams(formData.get("fiber")),
        sodiumMg: optionalGrams(formData.get("sodium")),
        // Typed by hand off a label is the one case the user can vouch for.
        precision: formData.get("exact") === "on" ? "exact" : "estimated",
      },
    ];
  }

  await prisma.meal.create({
    data: {
      userId: user.id,
      date,
      name,
      note,
      portion,
      brothLeft,
      items: {
        create: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          fiberG: item.fiberG,
          sodiumMg: item.sodiumMg,
          precision: item.precision,
          source: useAi ? "ai" : "manual",
        })),
      },
    },
  });

  revalidatePath("/meals");
  return { ok: true, note: aiNote };
}

/** Active burn for a day, typed by hand on the meals page. */
export async function saveActiveBurnAction(formData: FormData) {
  const user = await requireUser();

  const date = String(formData.get("date") ?? "");
  if (!isDayKey(date)) return;

  const raw = String(formData.get("activeBurn") ?? "").trim();
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 10000)) {
    return;
  }

  await prisma.dayLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { activeBurnKcal: value === null ? null : Math.round(value) },
    create: {
      userId: user.id,
      date,
      activeBurnKcal: value === null ? null : Math.round(value),
    },
  });

  revalidatePath("/meals");
}

export async function deleteMealAction(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Scoped by userId, so a forged post cannot delete someone else's meal.
  await prisma.meal.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/meals");
}

export async function deleteMealItemAction(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("itemId") ?? "");
  if (!id) return;

  await prisma.mealItem.deleteMany({
    where: { id, meal: { userId: user.id } },
  });
  revalidatePath("/meals");
}

function optionalGrams(value: FormDataEntryValue | null): number | null {
  if (value === null || String(value).trim() === "") return null;
  const grams = Number(value);
  return Number.isFinite(grams) && grams >= 0
    ? Math.round(grams * 10) / 10
    : null;
}
