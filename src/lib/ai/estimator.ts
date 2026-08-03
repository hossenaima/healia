import "server-only";

/**
 * Calorie estimation lives behind this interface so the rest of the app never
 * imports a vendor SDK. Swapping providers means adding one file here.
 */

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

Respond with JSON only, in this exact shape:
{"items":[{"name":string,"quantity":string|null,"calories":number,"proteinG":number|null,"carbsG":number|null,"fatG":number|null}],"note":string|null}

Calories are whole numbers. Macros are grams. Never invent items the user did
not mention. If the text describes no food at all, return {"items":[],"note":"..."}.`;

class OpenAIEstimator implements CalorieEstimator {
  readonly available = true;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async estimate(description: string): Promise<EstimateResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
      }),
      // A hung request would otherwise block the meal form indefinitely.
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `OpenAI request failed (${response.status}). ${body.slice(0, 200)}`,
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI returned an unexpected response shape.");
    }

    return normalizeResult(JSON.parse(content));
  }
}

class UnavailableEstimator implements CalorieEstimator {
  readonly available = false;

  async estimate(): Promise<EstimateResult> {
    throw new EstimatorUnavailableError(
      "AI estimation is off. Add OPENAI_API_KEY to your environment to turn it on.",
    );
  }
}

/** Model can be changed without a code edit as OpenAI's lineup shifts. */
const DEFAULT_MODEL = "gpt-4o-mini";

export function getEstimator(): CalorieEstimator {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new UnavailableEstimator();
  return new OpenAIEstimator(apiKey, process.env.OPENAI_MODEL || DEFAULT_MODEL);
}

/**
 * The model is asked for a fixed shape but is not bound by it, so every field is
 * re-checked before it reaches the database.
 */
function normalizeResult(raw: unknown): EstimateResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items: EstimatedItem[] = [];
  for (const entry of rawItems.slice(0, 25)) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const calories = num(item.calories);
    if (!name || calories === null) continue;

    items.push({
      name: name.slice(0, 200),
      quantity: typeof item.quantity === "string" ? item.quantity.slice(0, 100) : null,
      calories: Math.max(0, Math.round(calories)),
      proteinG: round1(num(item.proteinG)),
      carbsG: round1(num(item.carbsG)),
      fatG: round1(num(item.fatG)),
    });
  }

  const note = typeof obj.note === "string" && obj.note.trim() ? obj.note.trim() : undefined;
  return { items, note };
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.round(value * 10) / 10);
}
