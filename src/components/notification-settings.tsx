"use client";

import { useState, useTransition } from "react";
import { setNotificationPrefsAction } from "@/app/actions/notifications";
import { usePush } from "@/lib/use-push";

export function NotificationSettings({
  notifyWeighIn,
  notifyFriends,
  reminderHour,
  deviceCount,
}: {
  notifyWeighIn: boolean;
  notifyFriends: boolean;
  reminderHour: number;
  deviceCount: number;
}) {
  // Subscribing is shared with the header bell — see `usePush`. One flow with
  // this many quiet failure modes should not have two implementations.
  const { support, subscribed, devices, busy, status, setStatus, enable, disable } =
    usePush(deviceCount);
  const [, startWorking] = useTransition();

  // Held locally so a toggle answers the tap rather than the round trip.
  const [weighIn, setWeighIn] = useState(notifyWeighIn);
  const [friends, setFriends] = useState(notifyFriends);
  const [hour, setHour] = useState(reminderHour);

  async function turnOn() {
    const ok = await enable();
    // The first device turns both kinds on server-side; match that here.
    if (ok && devices === 0) {
      setWeighIn(true);
      setFriends(true);
    }
  }

  function save(input: {
    notifyWeighIn?: boolean;
    notifyFriends?: boolean;
    reminderHour?: number;
  }) {
    startWorking(async () => {
      const result = await setNotificationPrefsAction(input);
      if (!result.ok) setStatus(result.error ?? "Could not save that.");
    });
  }

  if (support === "checking") {
    return <div className="card mt-4 h-24 animate-pulse p-5" aria-hidden />;
  }

  if (support === "needs-install") {
    return (
      <div className="card mt-4 p-5">
        <p className="text-sm">
          iPhone only delivers notifications to apps on your Home Screen, not to
          Safari tabs.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Tap Share, then <strong>Add to Home Screen</strong>, and open Helia
          from there. This setting will work once you do.
        </p>
      </div>
    );
  }

  if (support === "unsupported") {
    return (
      <div className="card mt-4 p-5">
        <p className="text-sm text-ink-muted">
          This browser does not support notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {subscribed ? "On for this device" : "Off for this device"}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {devices === 0
              ? "No devices set up."
              : `${devices} device${devices === 1 ? "" : "s"} set up.`}
          </p>
        </div>
        <button
          type="button"
          onClick={subscribed ? disable : turnOn}
          disabled={busy}
          className={`btn !rounded-full shrink-0 !py-2 ${
            subscribed ? "btn-soft" : "btn-primary"
          }`}
        >
          {busy ? "…" : subscribed ? "Turn off" : "Turn on"}
        </button>
      </div>

      {subscribed && (
        <div className="mt-5 space-y-1 border-t border-rule pt-4">
          <Toggle
            label="Morning weigh-in"
            hint="Skipped on days you have already logged."
            checked={weighIn}
            onChange={(next) => {
              setWeighIn(next);
              save({ notifyWeighIn: next });
            }}
          />

          {weighIn && (
            <div className="flex items-center gap-3 pt-1 pb-2 pl-0.5">
              <label htmlFor="hour" className="sr-only">
                Reminder time
              </label>
              <select
                id="hour"
                value={String(hour)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHour(next);
                  save({ reminderHour: next });
                }}
                className="rounded-xl bg-surface-sunk px-3 py-2 text-sm font-semibold focus:outline-2 focus:outline-trace"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-muted">your local time</span>
            </div>
          )}

          <Toggle
            label="Friend activity"
            hint="When someone adds you or sends a note."
            checked={friends}
            onChange={(next) => {
              setFriends(next);
              save({ notifyFriends: next });
            }}
          />
        </div>
      )}

      {status && (
        <p role="status" className="mt-3 text-sm text-up">
          {status}
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="
          relative h-6 w-10 shrink-0 rounded-full bg-rule transition-colors
          peer-checked:bg-trace peer-focus-visible:outline-2
          peer-focus-visible:outline-offset-2 peer-focus-visible:outline-trace
          after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5
          after:rounded-full after:bg-ground after:transition-transform
          after:content-[''] peer-checked:after:translate-x-4
        "
      />
    </label>
  );
}

function formatHour(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}
