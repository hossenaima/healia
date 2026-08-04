import { dayKeyToDate } from "@/lib/dates";

/**
 * The last seven days at a glance: which ones you logged, and where today sits.
 * Pairs with the streak count, which is otherwise just an assertion.
 */
export function WeekStrip({
  days,
  logged,
  today,
}: {
  days: string[];
  logged: Set<string>;
  today: string;
}) {
  return (
    <ul className="mt-4 flex justify-between gap-1">
      {days.map((day) => {
        const has = logged.has(day);
        const isToday = day === today;
        const letter = new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          weekday: "narrow",
        }).format(dayKeyToDate(day));

        return (
          <li key={day} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[0.7rem] font-bold opacity-50">{letter}</span>
            <span
              title={day}
              className={`
                flex aspect-square w-full max-w-11 items-center justify-center
                rounded-2xl text-sm font-bold
                ${
                  has
                    ? "bg-trace text-white"
                    : isToday
                      ? "bg-surface ring-2 ring-trace/40"
                      : "bg-surface opacity-60"
                }
              `}
            >
              {Number(day.slice(8))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
