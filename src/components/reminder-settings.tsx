"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setReminderHourAction,
  subscribeAction,
  unsubscribeAction,
  type ReminderResult,
} from "@/app/actions/reminders";

type Support =
  | "checking"
  | "ready"
  | "needs-install" // iOS Safari outside a Home Screen app
  | "unsupported";

export function ReminderSettings({
  publicKey,
  reminderHour,
  deviceCount,
}: {
  publicKey: string | null;
  reminderHour: number | null;
  deviceCount: number;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const [hour, setHour] = useState(reminderHour ?? 8);

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
        if (!cancelled) setSupport(iOS && !standalone ? "needs-install" : "unsupported");
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
      setStatus("No push key configured on the server.");
      return;
    }
    setStatus(null);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notifications are blocked for this site in your browser.");
      return;
    }

    // Subscribing fails for reasons the page cannot see coming — a private
    // window, a profile with push disabled, no network to the push service.
    // Say so, rather than leaving a button that appears to do nothing.
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
    startWorking(async () => {
      const result = await subscribeAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setSubscribed(result.ok);
      setStatus(result.error ?? result.message ?? null);
    });
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      startWorking(async () => {
        await unsubscribeAction(sub.endpoint);
        setSubscribed(false);
        setStatus("This device will not get reminders.");
      });
    }
  }

  return (
    <div className="card mt-4 p-5">
      {support === "needs-install" && (
        <>
          <p className="text-sm">
            iPhone only delivers notifications to apps on your Home Screen, not
            to Safari tabs.
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Tap Share, then <strong>Add to Home Screen</strong>, and open Helia
            from there. This setting will work once you do.
          </p>
        </>
      )}

      {support === "unsupported" && (
        <p className="text-sm text-ink-muted">
          This browser does not support notifications.
        </p>
      )}

      {support === "ready" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {subscribed ? "This device is set up" : "Reminders are off here"}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {deviceCount === 0
                  ? "No devices yet."
                  : `${deviceCount} device${deviceCount === 1 ? "" : "s"} set up.`}
              </p>
            </div>
            <button
              type="button"
              onClick={subscribed ? disable : enable}
              disabled={working}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 ${
                subscribed ? "bg-surface-sunk" : "bg-ink text-ground"
              }`}
            >
              {subscribed ? "Turn off" : "Turn on"}
            </button>
          </div>

          <form action={reminderFormAction} className="mt-5">
            <label htmlFor="hour" className="eyebrow block">
              Remind me at
            </label>
            <div className="mt-2 flex items-center gap-3">
              <select
                id="hour"
                name="hour"
                value={reminderHour === null ? "off" : String(hour)}
                onChange={(e) => {
                  if (e.target.value !== "off") setHour(Number(e.target.value));
                  e.currentTarget.form?.requestSubmit();
                }}
                className="rounded-xl bg-surface-sunk px-3 py-2 text-sm font-semibold focus:outline-2 focus:outline-trace"
              >
                <option value="off">Never</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-muted">your local time</span>
            </div>
          </form>
        </>
      )}

      {status && (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          {status}
        </p>
      )}
    </div>
  );
}

/** Bound outside the component so the select can submit without a button. */
async function reminderFormAction(formData: FormData) {
  await setReminderHourAction({ ok: false } as ReminderResult, formData);
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
