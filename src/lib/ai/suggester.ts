import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  LOCATIONS,
  SATIETY_GOALS,
  type Location,
  type SatietyGoal,
  type Suggestion,
} from "@/lib/eat";

export type { Suggestion };

/**
 * "What can I eat?" — suggestions that fit the calories left in the day.
 *
 * Generated per request rather than served from a built-in list: a hardcoded
 * table of restaurant calories would go stale silently and could not use the
 * ingredients someone actually has in the fridge.
 */

// Values mirror `@/lib/eat`, which the form also reads from.
const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        calories: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
        fiberG: z.number(),
        /** Why this one keeps you full — the point of the whole feature. */
        satietyNote: z.string(),
        /** Ingredients used that the user said they had. */
        usesOnHand: z.array(z.string()),
      }),
    )
    .max(6),
  note: z.string().nullable(),
});

export type SuggestionRequest = {
  remainingCalories: number;
  satiety: SatietyGoal;
  location: Location;
  ingredientsOnHand: string[];
  proteinLeftG: number | null;
  fiberLeftG: number | null;
};

export type SuggestionResult = {
  suggestions: Suggestion[];
  note?: string;
};

export class SuggesterUnavailableError extends Error {}

const SYSTEM_PROMPT = `You suggest meals that fit inside a calorie budget.

Return 3 to 5 options. Every option must come in at or under the stated
remaining calories — that ceiling is the whole point, so never exceed it.

Match the satiety goal:
- high_protein: at least 25g of protein per option where the budget allows.
- high_fiber: at least 8g of fiber per option.
- low_density: large physical volume for the calories, so the plate looks full.

Match the location:
- home: things cookable in about 15 minutes from ordinary groceries.
- out: orders from widely available chains and everyday takeout, described as
  what to ask for. Prefer customisable builds over named menu items, because a
  chain's exact recipe varies by location and changes without notice.

If the user lists ingredients on hand, build options primarily from those, and
put the ones you used in usesOnHand. Add at most one or two common staples
(oil, salt, spices, a starch) and say so in the description. If those
ingredients cannot make anything sensible inside the budget, say that in the
note rather than inventing a bad option.

satietyNote is one short sentence on why this keeps you full — lead with the
mechanism (protein, fiber, volume, water content), not with praise.

Calorie and macro figures are estimates for a typical preparation, not label
values. Keep descriptions to one sentence.`;

class AnthropicSuggester {
  readonly available = true;

  constructor(private readonly client: Anthropic) {}

  async suggest(request: SuggestionRequest): Promise<SuggestionResult> {
    const lines = [
      `Remaining calories: ${request.remainingCalories}`,
      `Satiety goal: ${request.satiety}`,
      `Location: ${request.location}`,
    ];
    if (request.proteinLeftG !== null) {
      lines.push(`Protein still to hit today: ${request.proteinLeftG}g`);
    }
    if (request.fiberLeftG !== null) {
      lines.push(`Fiber still to hit today: ${request.fiberLeftG}g`);
    }
    if (request.ingredientsOnHand.length > 0) {
      lines.push(`Ingredients on hand: ${request.ingredientsOnHand.join(", ")}`);
    }

    const response = await this.client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: {
        // Fitting several options inside a hard ceiling while honouring the
        // satiety goal is real constraint-satisfaction, so this gets more room
        // to think than the single-meal estimator does.
        effort: "medium",
        format: zodOutputFormat(suggestionSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: lines.join("\n") }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to answer that.");
    }
    const parsed = response.parsed_output;
    if (!parsed) throw new Error("The model returned no usable suggestions.");

    // The budget is the contract. Drop anything over it rather than showing a
    // suggestion the user would have to do arithmetic to reject.
    const withinBudget = parsed.suggestions.filter(
      (s) => Math.round(s.calories) <= request.remainingCalories,
    );
    const dropped = parsed.suggestions.length - withinBudget.length;

    return {
      suggestions: withinBudget.map((s) => ({
        ...s,
        calories: Math.max(0, Math.round(s.calories)),
        proteinG: round1(s.proteinG),
        carbsG: round1(s.carbsG),
        fatG: round1(s.fatG),
        fiberG: round1(s.fiberG),
      })),
      note:
        parsed.note?.trim() ||
        (dropped > 0
          ? `Left out ${dropped} option${dropped === 1 ? "" : "s"} that came in over your remaining calories.`
          : undefined),
    };
  }
}

class UnavailableSuggester {
  readonly available = false;

  async suggest(): Promise<SuggestionResult> {
    throw new SuggesterUnavailableError(
      "Suggestions need an Anthropic API key. Add ANTHROPIC_API_KEY to your environment to turn them on.",
    );
  }
}

export function getSuggester(): AnthropicSuggester | UnavailableSuggester {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new UnavailableSuggester();
  return new AnthropicSuggester(
    new Anthropic({ apiKey, timeout: 60_000 }),
  );
}

function round1(n: number) {
  return Math.max(0, Math.round(n * 10) / 10);
}
