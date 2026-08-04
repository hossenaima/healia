/**
 * Goal progress as a ring, with the current reading inside it.
 *
 * A ring reads as "how far round am I" at a glance, which is the question this
 * number answers. The percentage is also written out, because an arc alone is
 * hard to read precisely.
 */
export function ProgressRing({
  percent,
  value,
  unit,
  caption,
  size = 168,
}: {
  percent: number | null;
  value: string;
  unit: string;
  caption: string;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = percent === null ? 0 : (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          percent === null
            ? `${value} ${unit}`
            : `${Math.round(percent)} percent of the way from your start weight to your goal`
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-sunk)"
          strokeWidth={stroke}
        />
        {percent !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--trace)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            // Start at twelve o'clock rather than three.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="tnum text-4xl font-extrabold leading-none">{value}</p>
        <p className="mt-0.5 text-sm font-bold text-ink-faint">{unit}</p>
        <p className="mt-1 text-xs text-ink-muted">{caption}</p>
      </div>
    </div>
  );
}
