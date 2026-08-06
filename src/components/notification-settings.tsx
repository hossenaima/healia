"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setNotificationPrefsAction,
  subscribeAction,
  unsubscribeAction,
} from "@/app/actions/notifications";

type Support =
  | "checking"
  | "ready"
  | "needs-install" // iOS Safari outside a Home Screen app
  | "unsupported";

export function NotificationSettings({
  publicKey,
  notifyWeighIn,
  notifyFriends,
  reminderHour,
  deviceCount,
}: {
  publicKey: string | null;
  notifyWeighIn: boolean;
  notifyFriends: boolean;
  reminderHour: number;
  deviceCount: number;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState(deviceCount);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startWorking] = useTransition();

  // Held locally so a toggle answers the tap rather than the round trip.
  const [weighIn, setWeighIn] = useState(notifyWeighIn);
  const [friends, setFriends] = useState(notifyFriends);
  const [hour, setHour] = useState(reminderHour);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hasApi =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      // iOS only delivers web push to a Home Screen app. In a normal Safari tab
      // PushManager is missing entirely, so say why rather than fail silently.
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari's own flag, not in the standard Navigator type.
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      if (!hasApi) {
        if (!cancelled) {
          setSupport(iOS && !standalone ? "needs-install" : "unsupported");
        }
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration();
      const existing = await reg?.pushManager.getSubscription();
      if (cancelled) return;
      setSubscribed(Boolean(existing));
      setSupport("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!publicKey) {
      setStatus("No push key is configured on the server.");
      return;
    }
    setStatus(null);
    setBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(
          permission === "denied"
            ? "Notifications are blocked for Helia in your browser settings."
            : "Notifications were not allowed.",
        );
        return;
      }

      // Subscribing fails for reasons the page cannot see coming — a private
      // window, a profile with push disabled, no route to the push service.
      // Say so, rather than leaving a switch that appears to do nothing.
      let sub: PushSubscription;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } catch (error) {
        setStatus(
          `This browser would not set up notifications: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
        return;
      }

      const json = sub.toJSON();
      const result = await subscribeAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });

      if (!result.ok) {
        setStatus(result.error ?? "Could not save this device.");
        return;
      }

      setSubscribed(true);
      setDevices((n) => n + 1);
      // The first device turns both kinds on server-side; match that here.
      if (devices === 0) {
        setWeighIn(true);
        setFriends(true);
      }
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribeAction(sub.endpoint);
      }
      setSubscribed(false);
      setDevices((n) => Math.max(0, n - 1));
      setStatus(null);
    } finally {
      setBusy(false);
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
          onClick={subscribed ? disable : enable}
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

/** VAPID keys are base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
