/**
 * A streak is only motivating if it is honest about what breaks it, so this
 * counts consecutive days with a weigh-in and says plainly when there is none.
 */
export function StreakTile({
  current,
  best,
}: {
  current: number;
  best: number;
}) {
  return (
    <div className="tile mt-4 flex items-center gap-4 p-5">
      <span aria-hidden className="text-4xl leading-none">
        {current > 0 ? "🔥" : "○"}
      </span>
      <div className="min-w-0">
        <p className="tnum text-3xl font-bold leading-none">
          {current}
          <span className="ml-2 text-base font-bold text-ink-muted">
            {current === 1 ? "day" : "days"}
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {current === 0
            ? "Log today to start a streak."
            : best > current
              ? `Current streak · best is ${best}`
              : "Your best streak yet."}
        </p>
      </div>
    </div>
  );
}
