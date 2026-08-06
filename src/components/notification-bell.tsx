"use client";

import Link from "next/link";
import { usePush } from "@/lib/use-push";

/**
 * Notifications on or off for this device, from the header.
 *
 * The bell reflects the state the account is already in rather than asking
 * again — struck through when off, plain when on. What each kind of
 * notification does still lives in Settings; this is only the master switch,
 * because turning them off in a hurry is the thing you want at hand.
 *
 * Where push cannot work at all — an iPhone in a Safari tab, a browser without
 * the APIs — the bell becomes a link to Settings, which has the room to
 * explain why.
 */
export function NotificationBell() {
  const { support, subscribed, busy, status, enable, disable } = usePush();

  // Nothing until the check resolves. A bell that starts "off" and flicks on a
  // moment later reads as having been turned on by the page load.
  if (support === "checking") {
    return <span className="block h-6 w-6" aria-hidden />;
  }

  if (support !== "ready") {
    return (
      <Link
        href="/settings"
        aria-label="Notifications — see Settings"
        title="Notifications need setting up — see Settings"
        className="block text-ink-faint transition-colors hover:text-ink-muted"
      >
        <BellIcon off />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (subscribed ? disable() : enable())}
      disabled={busy}
      aria-pressed={subscribed}
      aria-label={
        subscribed ? "Notifications on — turn off" : "Notifications off — turn on"
      }
      title={status ?? (subscribed ? "Notifications on" : "Notifications off")}
      className={`
        block transition-colors disabled:opacity-40
        ${subscribed ? "text-ink hover:text-ink-muted" : "text-ink-faint hover:text-ink-muted"}
      `}
    >
      <BellIcon off={!subscribed} />
    </button>
  );
}

function BellIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M13.7 20a2 2 0 0 1-3.4 0" />
      {/* A slash, rather than a second icon — the same bell, switched off. */}
      {off && <path d="M3.5 3.5 20.5 20.5" />}
    </svg>
  );
}
