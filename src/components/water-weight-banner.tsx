import { formatDayShort } from "@/lib/dates";
import type { DayTag } from "@/lib/nutrition";

/**
 * The "no-panic" note. A scale jump the morning after a salty or very
 * high-fiber meal is water and digestion, and the number on its own invites
 * exactly the wrong conclusion — so the app says what it knows.
 */
export function WaterWeightBanner({
  gainLbs,
  units,
  tags,
  onDate,
}: {
  gainLbs: number;
  units: string;
  tags: DayTag[];
  onDate: string;
}) {
  const causes = [
    tags.includes("high_sodium") && "a high-sodium meal",
    tags.includes("high_volume") && "a lot of fiber",
  ].filter(Boolean) as string[];

  return (
    <aside
      role="note"
      className="
        mt-5 rounded-xl border-l-[3px] border-goal bg-surface p-4
        shadow-[var(--lift-sm)]
      "
    >
      <p className="eyebrow !text-goal">Before you panic</p>
      <p className="mt-1.5 text-sm">
        You are up{" "}
        <span className="tnum font-medium">
          {gainLbs.toFixed(1)} {units}
        </span>{" "}
        since yesterday, and you logged {causes.join(" and ")} on{" "}
        {formatDayShort(onDate)}. That is water and digestion, not fat — sodium
        and fiber both pull water into the body and it clears over a day or two.
        Watch the 7-day average instead.
      </p>
    </aside>
  );
}
