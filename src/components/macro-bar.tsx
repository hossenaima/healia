import { macroEnergyShares, type Macros } from "@/lib/meals";

const PARTS = [
  { key: "protein", label: "Protein", grams: "proteinG", color: "var(--protein)" },
  { key: "carbs", label: "Carbs", grams: "carbsG", color: "var(--carbs)" },
  { key: "fat", label: "Fat", grams: "fatG", color: "var(--fat)" },
] as const;

/**
 * Where the day's energy came from. Every segment is labelled with its gram
 * count, so the split is readable without relying on colour to tell the three
 * macros apart.
 */
export function MacroBar({
  macros,
  size = "full",
}: {
  macros: Macros;
  /** "compact" drops the labels for use inside a meal row. */
  size?: "full" | "compact";
}) {
  const shares = macroEnergyShares(macros);
  if (!shares) return null;

  const description = PARTS.map(
    (p) => `${p.label} ${Math.round(macros[p.grams])} grams`,
  ).join(", ");

  return (
    <div className={size === "full" ? "mt-3" : "mt-2"}>
      <div
        role="img"
        aria-label={`Macro split: ${description}`}
        className="flex h-1.5 gap-0.5 overflow-hidden"
      >
        {PARTS.map((part) => (
          <span
            key={part.key}
            className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${shares[part.key]}%`,
              backgroundColor: part.color,
            }}
          />
        ))}
      </div>

      <ul
        aria-hidden
        className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 ${
          size === "full" ? "text-xs" : "text-[0.7rem]"
        } text-ink-muted`}
      >
        {PARTS.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: part.color }}
            />
            {part.label}
            <span className="tnum text-ink">
              {Math.round(macros[part.grams])}g
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
