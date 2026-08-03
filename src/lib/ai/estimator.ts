import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Calorie estimation lives behind this interface so the rest of the app never
 * imports a vendor SDK. Swapping providers means editing this file only.
 */

// The model is constrained to this shape by structured outputs, so the response
// is schema-valid by construction rather than by hand-written validation.
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

export class EstimatorUnavailableError extends Error {}

const SYSTEM_PROMPT = `You estimate nutrition for food described in plain language.

Break the description into individual food items. For each item, give your best
estimate of calories and macros for the portion described. If no portion is
given, assume a typical single serving and say so in the note.

Calories are whole numbers. Macros are in grams. Never invent items the user did
not mention. If the text describes no food at all, return an empty items list
and explain why in the note.`;

class AnthropicEstimator implements CalorieEstimator {
  readonly available = true;

  constructor(private readonly client: Anthropic) {}

  async estimate(description: string): Promise<EstimateResult> {
    const response = await this.client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      // Splitting a meal into items is a light extraction task, so it does not
      // need deep reasoning — low effort keeps the weigh-in loop quick.
      output_config: {
        effort: "low",
        format: zodOutputFormat(estimateSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
    });

    // A refusal returns a normal 200 with no parsed output, so this has to be
    // checked before reading the result.
    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to estimate that description.");
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("The model returned no usable estimate.");
    }

    return {
      items: parsed.items.map((item) => ({
        name: item.name.slice(0, 200),
        quantity: item.quantity?.slice(0, 100) ?? null,
        calories: Math.max(0, Math.round(item.calories)),
        proteinG: round1(item.proteinG),
        carbsG: round1(item.carbsG),
        fatG: round1(item.fatG),
      })),
      note: parsed.note?.trim() || undefined,
    };
  }
}

class UnavailableEstimator implements CalorieEstimator {
  readonly available = false;

  async estimate(): Promise<EstimateResult> {
    throw new EstimatorUnavailableError(
      "AI estimation is off. Add ANTHROPIC_API_KEY to your environment to turn it on.",
    );
  }
}

export function getEstimator(): CalorieEstimator {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new UnavailableEstimator();

  return new AnthropicEstimator(
    new Anthropic({
      apiKey,
      // A hung request would otherwise block the meal form indefinitely.
      timeout: 45_000,
    }),
  );
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.round(value * 10) / 10);
}
