import "server-only";

import { z } from "zod";
import { AiUnavailableError, aiAvailable, generateJson } from "@/lib/ai/gemini";

/**
 * Calorie estimation lives behind this interface so the rest of the app never
 * imports a vendor SDK.
 */

const estimateSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string().nullable(),
        calories: z.number(),
        proteinG: z.number().nullable(),
        carbsG: z.number().nullable(),
        fatG: z.number().nullable(),
        fiberG: z.number().nullable(),
        sodiumMg: z.number().nullable(),
        precision: z.enum(["exact", "estimated"]),
      }),
    )
    .max(25),
  note: z.string().nullable(),
});

export type EstimatedItem = {
  name: string;
  quantity: string | null;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  precision: "exact" | "estimated";
};

export type EstimateResult = {
  items: EstimatedItem[];
  /** Caveats worth showing the user, e.g. an assumed portion size. */
  note?: string;
};

export interface CalorieEstimator {
  readonly available: boolean;
  estimate(description: string): Promise<EstimateResult>;
}

/** Re-exported so callers keep one error type to catch. */
export { AiUnavailableError as EstimatorUnavailableError };

const SYSTEM_PROMPT = `You estimate nutrition for food described in plain language.

Break the description into individual food items. For each item, give your best
estimate of calories and macros for the portion described. If no portion is
given, assume a typical single serving and say so in the note.

Always fill in protein, carbs, fat, fiber, and sodium — the app charts the macro
split and uses sodium to explain overnight scale jumps, so a null leaves a gap.
Use 0 only when the food genuinely contains none of it (black coffee has no fat;
olive oil has no carbs).

Set precision to "exact" only for a packaged item with a nutrition label the
user clearly named, such as a branded bar or a canned drink. Anything a kitchen
made — restaurant dishes, takeout, home cooking with unmeasured oil — is
"estimated", because the oil, sauce, and portion are decided by whoever cooked
it.

Calories are whole numbers. Macros are in grams, sodium in milligrams. Never
invent items the user did not mention. If the text describes no food at all,
return an empty items list and explain why in the note.`;

class GeminiEstimator implements CalorieEstimator {
  readonly available = true;

  async estimate(description: string): Promise<EstimateResult> {
    const parsed = await generateJson({
      schema: estimateSchema,
      system: SYSTEM_PROMPT,
      prompt: description,
    });

    return {
      items: parsed.items.map((item) => ({
        name: item.name.slice(0, 200),
        quantity: item.quantity?.slice(0, 100) ?? null,
        calories: Math.max(0, Math.round(item.calories)),
        proteinG: round1(item.proteinG),
        carbsG: round1(item.carbsG),
        fatG: round1(item.fatG),
        fiberG: round1(item.fiberG),
        sodiumMg:
          item.sodiumMg === null ? null : Math.max(0, Math.round(item.sodiumMg)),
        precision: item.precision,
      })),
      note: parsed.note?.trim() || undefined,
    };
  }
}

class UnavailableEstimator implements CalorieEstimator {
  readonly available = false;

  async estimate(): Promise<EstimateResult> {
    throw new AiUnavailableError(
      "Estimation is off. Add GEMINI_API_KEY to your environment to turn it on.",
    );
  }
}

export function getEstimator(): CalorieEstimator {
  return aiAvailable() ? new GeminiEstimator() : new UnavailableEstimator();
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.round(value * 10) / 10);
}
