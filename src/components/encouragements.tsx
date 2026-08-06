"use client";

import { useEffect, useState } from "react";
import { markEncouragementsReadAction } from "@/app/actions/friends";

type Note = {
  id: string;
  from: string;
  body: string;
  unread: boolean;
  /** Already formatted in the reader's own timezone by the server. */
  at: string;
  /** Epoch ms when this note goes, or null while it is still unread. */
  expiresAt: number | null;
};

/**
 * Notes friends have sent.
 *
 * Marked read on view, which both clears the tab badge and starts the clock:
 * a note goes some hours after you have actually seen it. Unread ones wait
 * indefinitely, so nothing disappears before it has been read.
 */
export function Encouragements({
  notes,
  ttlHours,
}: {
  notes: Note[];
  ttlHours: number;
}) {
  const unread = notes.filter((n) => n.unread).length;

  useEffect(() => {
    if (unread > 0) void markEncouragementsReadAction();
  }, [unread]);

  if (notes.length === 0) return null;

  return (
    <section className="mt-5" aria-label="Encouragement">
      <h2 className="eyebrow">
        From your friends{unread > 0 && ` · ${unread} new`}
      </h2>
      <ul className="mt-3 space-y-2">
        {notes.slice(0, 6).map((n, i) => (
          <li
            key={n.id}
            className="settle card p-4"
            style={{ animationDelay: `${Math.min(i, 5) * 45}ms` }}
          >
            <p className="text-sm">{n.body}</p>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
              <span className="font-semibold">{n.from}</span>
              <span>{n.at}</span>
              <Fades expiresAt={n.expiresAt} ttlHours={ttlHours} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Says when the note goes, so that next visit it is gone rather than missing.
 *
 * Rendered only after mount: the server cannot know the reader's clock, and a
 * "in 7 hours" computed during rendering would arrive already stale.
 */
function Fades({
  expiresAt,
  ttlHours,
}: {
  expiresAt: number | null;
  ttlHours: number;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (expiresAt === null) {
      setLabel(`fades ${ttlHours}h after you read it`);
      return;
    }
    const tick = () => {
      const left = expiresAt - Date.now();
      if (left <= 0) return setLabel("fading now");
      const hours = Math.floor(left / 3_600_000);
      const mins = Math.round((left % 3_600_000) / 60_000);
      setLabel(hours > 0 ? `fades in ${hours}h` : `fades in ${mins}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [expiresAt, ttlHours]);

  if (label === null) return null;
  return <span className="text-ink-faint">· {label}</span>;
}
