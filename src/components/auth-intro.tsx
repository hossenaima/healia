/**
 * What Helia is, on the two screens where someone might not know yet.
 *
 * An invited tester arriving at a PIN box has been told "try my app" and
 * nothing else. Three lines is enough to say what it does and what it will
 * ask of them daily, which is the thing that decides whether they bother.
 */
export function AuthIntro() {
  return (
    <ul className="mt-5 space-y-2.5">
      {[
        ["Weigh in", "One number each morning. The chart smooths it into a trend, so a bad day does not look like a disaster."],
        ["Log meals", "Describe what you ate in plain words and it works out the calories and macros."],
        ["Keep a streak", "See the days you logged, and cheer on a friend without either of you seeing the other's meals."],
      ].map(([title, body]) => (
        <li key={title} className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-trace" />
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{title}.</span> {body}
          </p>
        </li>
      ))}
    </ul>
  );
}
