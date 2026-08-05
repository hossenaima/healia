"use client";

import { useEffect } from "react";
import { markEncouragementsReadAction } from "@/app/actions/friends";

/** Notes friends have sent. Marked read on view, so the badge clears itself. */
export function Encouragements({
  notes,
}: {
  notes: Array<{
    id: string;
    from: string;
    body: string;
    unread: boolean;
    at: string;
  }>;
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
        {notes.slice(0, 6).map((n) => (
          <li key={n.id} className="card p-4">
            <p className="text-sm">{n.body}</p>
            <p className="eyebrow mt-1.5">
              {n.from} ·{" "}
              {new Date(n.at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
