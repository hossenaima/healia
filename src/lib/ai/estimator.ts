import "server-only";

import { z } from "zod";
import { AiUnavailableError, aiAvailable, generateJson } from "@/lib/ai/gemini";

/**
 * Calorie estimation lives behind this interface so the rest of the app never
 * imports a vendor SDK.
 */

/*
 * Deliberately plain: every field required, no nullable unions, and no array
 * length cap.
 *
 * Gemini compiles this into a decoding constraint with a hard complexity
 * budget, and it rejects the request outright — "too many states for serving" —
 * if the schema is too rich. A `maxItems` on a nested array is the worst
 * offender, and each nullable field doubles the states again. The length cap
 * lives in code below, where it costs nothing.
 */
const estimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      /** Empty string rather than null, for the same reason. */
      quantity: z.string(),
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      fiberG: z.number(),
      sodiumMg: z.number(),
      precision: z.enum(["exact", "estimated"]),
    }),
  ),
  note: z.string(),
});

/** Backstop on a runaway reply, enforced here instead of in the schema. */
const MAX_ITEMS = 25;

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

Fill in every field. Use 0 when the food genuinely contains none of that macro
(black coffee has no fat; olive oil has no carbs). Leave quantity as an empty
string if no portion was given.

If the description says how much was actually eaten — "a third of the fries",
"half the bowl", "left the broth" — estimate what was eaten, not what was
served, and say what you assumed in the note.

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
      items: parsed.items.slice(0, MAX_ITEMS).map((item) => ({
        name: item.name.slice(0, 200),
        quantity: item.quantity.trim().slice(0, 100) || null,
        calories: Math.max(0, Math.round(item.calories)),
        proteinG: round1(item.proteinG),
        carbsG: round1(item.carbsG),
        fatG: round1(item.fatG),
        fiberG: round1(item.fiberG),
        sodiumMg: Math.max(0, Math.round(item.sodiumMg)),
        precision: item.precision,
      })),
      note: parsed.note.trim() || undefined,
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

function round1(value: number): number {
  return Math.max(0, Math.round(value * 10) / 10);
}
