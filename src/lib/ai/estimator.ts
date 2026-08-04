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
      /** The working: portion assumed, what was counted, what was left out. */
      basis: z.string(),
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
  basis: string | null;
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

Break the description into the individual ingredients a person could adjust.

If the description says what something is made of or topped with, itemise those
components separately — do not collapse them back into the dish name. "Chia
seed pudding made with greek yogurt and whole milk, topped with berries and
granola" is five items: chia seeds, greek yogurt, whole milk, mixed berries,
granola. Someone who used less granola needs a granola line to change.

Keep something whole only when the person did not say what went into it and
could not reasonably change it — a named restaurant dish, a packaged bar, a
shop-bought sandwich. Splitting a Big Mac into bun, patty and sauce is noise.

Always give a quantity for every item, in the units a person would use — "1
cup", "2 tbsp", "3 oz", "1 medium". Estimate a sensible portion when none was
given and say so in the note.

For each item, "basis" is one short sentence showing your working: the portion
you assumed, what you counted, and anything you left out. Write it so someone
can disagree with a specific number.

If the description says how much was actually eaten — "a third of the fries",
"half the bowl", "left the broth" — estimate what was eaten, not what was
served, and say what you assumed in the note.

Set precision to "exact" only for a packaged item with a nutrition label the
person clearly named, such as a branded bar or a canned drink. Anything a
kitchen made is "estimated", because the oil, sauce and portion are decided by
whoever cooked it.

Fill in every field. Use 0 when the food genuinely contains none of that macro
(black coffee has no fat; olive oil has no carbs). Calories are whole numbers,
macros in grams, sodium in milligrams. Never invent food the person did not
mention. If the text describes no food at all, return an empty items list and
explain why in the note.`;

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
        basis: item.basis.trim().slice(0, 300) || null,
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
