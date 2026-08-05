"use client";

import { useActionState, useState } from "react";
import {
  requestFriendAction,
  respondToRequestAction,
  removeFriendAction,
  sendEncouragementAction,
  type FriendResult,
} from "@/app/actions/friends";
import type { FriendSummary } from "@/lib/friends";
import { formatDayShort } from "@/lib/dates";
import { formatDelta, fromLbs, type Units } from "@/lib/units";

const INITIAL: FriendResult = { ok: false };

const QUICK = [
  "Nice work today 👏",
  "Proud of you",
  "Keep the streak going 🔥",
];

export function FriendsPanel({
  friends,
  incoming,
  outgoing,
  units,
}: {
  friends: FriendSummary[];
  incoming: Array<{ id: string; name: string }>;
  outgoing: Array<{ id: string; name: string }>;
  units: Units;
}) {
  const [state, addAction, adding] = useActionState(requestFriendAction, INITIAL);

  return (
    <>
      {incoming.length > 0 && (
        <section className="mt-5" aria-label="Requests">
          <h2 className="eyebrow">Wants to be friends</h2>
          <ul className="mt-3 space-y-2">
            {incoming.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                </span>
                <form action={respondToRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="accept" value="0" />
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-muted transition-colors hover:text-ink"
                  >
                    Ignore
                  </button>
                </form>
                <form action={respondToRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="accept" value="1" />
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-ground transition-opacity hover:opacity-90"
                  >
                    Accept
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-label="Friends">
        <h2 className="eyebrow">Friends</h2>

        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No friends yet. Add someone by the name they signed up with.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {friends.map((f) => (
              <FriendCard key={f.id} friend={f} units={units} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-label="Add a friend">
        <h2 className="eyebrow">Add someone</h2>
        <form action={addAction} className="card mt-3 p-5">
          <label htmlFor="friend-name" className="eyebrow block">
            Their name
          </label>
          <input
            id="friend-name"
            name="name"
            type="text"
            autoComplete="off"
            placeholder="exactly as they signed up"
            className="mt-2 w-full border-b border-rule bg-transparent pb-1 text-lg placeholder:text-ink-faint focus:border-trace focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="mt-5 w-full rounded-full bg-ink px-4 py-3 text-sm font-bold text-ground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {adding ? "Sending" : "Send invite"}
          </button>
          <p
            role="status"
            className={`mt-3 text-sm ${state.error ? "text-up" : "text-ink-muted"}`}
          >
            {state.error ?? state.message ?? ""}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            They see your weigh-ins and streak once they accept — never your
            meals.
          </p>
        </form>

        {outgoing.length > 0 && (
          <p className="mt-3 text-xs text-ink-muted">
            Waiting on: {outgoing.map((o) => o.name).join(", ")}
          </p>
        )}
      </section>
    </>
  );
}

function FriendCard({
  friend,
  units,
}: {
  friend: FriendSummary;
  units: Units;
}) {
  const [state, sendAction, sending] = useActionState(
    sendEncouragementAction,
    INITIAL,
  );
  const [body, setBody] = useState("");

  return (
    <li className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 flex-1 truncate font-bold">{friend.name}</p>
        <span className="tnum shrink-0 text-sm">
          {friend.latestLbs === null
            ? "—"
            : `${fromLbs(friend.latestLbs, units).toFixed(1)} ${units}`}
        </span>
      </div>

      <p className="mt-1 text-xs text-ink-muted">
        {friend.latestDate === null ? (
          "Has not logged a weigh-in yet"
        ) : (
          <>
            {friend.loggedToday
              ? "Logged today"
              : `Last logged ${formatDayShort(friend.latestDate)}`}
            {friend.changeLbs !== null && (
              <>
                {" · "}
                <span className={friend.changeLbs < 0 ? "text-down" : "text-up"}>
                  {friend.changeLbs < 0 ? "↓" : "↑"}{" "}
                  {formatDelta(friend.changeLbs, units)}
                </span>
              </>
            )}
            {friend.streak > 0 && <> · 🔥 {friend.streak}</>}
          </>
        )}
      </p>

      <form action={sendAction} className="mt-3">
        <input type="hidden" name="toId" value={friend.id} />
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setBody(q)}
              className="rounded-full bg-surface-sunk px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            name="body"
            type="text"
            maxLength={200}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Send ${friend.name} a note`}
            aria-label={`Encouragement for ${friend.name}`}
            className="min-w-0 flex-1 rounded-xl bg-surface-sunk px-3 py-2 text-sm placeholder:text-ink-faint focus:outline-2 focus:outline-trace"
          />
          <button
            type="submit"
            disabled={sending || body.trim() === ""}
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-ground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
        {(state.error || state.message) && (
          <p
            role="status"
            className={`mt-2 text-xs ${state.error ? "text-up" : "text-ink-muted"}`}
          >
            {state.error ?? state.message}
          </p>
        )}
      </form>

      <form action={removeFriendAction} className="mt-3">
        <input type="hidden" name="otherId" value={friend.id} />
        <button
          type="submit"
          className="eyebrow transition-colors hover:!text-up"
        >
          Remove friend
        </button>
      </form>
    </li>
  );
}
