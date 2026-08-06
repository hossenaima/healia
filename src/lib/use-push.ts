"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subscribeAction,
  unsubscribeAction,
} from "@/app/actions/notifications";

export type PushSupport =
  | "checking"
  | "ready"
  | "needs-install" // iOS Safari outside a Home Screen app
  | "unsupported";

/**
 * This device's push subscription.
 *
 * Shared by the header bell and the Settings panel so there is one
 * implementation of a flow with several ways to fail quietly: permission
 * refused, a browser that has the APIs but will not subscribe, and iOS, which
 * omits `PushManager` entirely outside a Home Screen app and offers no way to
 * find out why.
 */
export function usePush(initialDeviceCount = 0) {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState(initialDeviceCount);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hasApi =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

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

  const enable = useCallback(async (): Promise<boolean> => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("No push key is configured on the server.");
      return false;
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
        return false;
      }

      // Subscribing fails for reasons the page cannot see coming — a private
      // window, a profile with push disabled, no route to the push service.
      // Say so, rather than leaving a control that appears to do nothing.
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
        return false;
      }

      const json = sub.toJSON();
      const result = await subscribeAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });

      if (!result.ok) {
        setStatus(result.error ?? "Could not save this device.");
        return false;
      }

      setSubscribed(true);
      setDevices((n) => n + 1);
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
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
  }, []);

  return { support, subscribed, devices, busy, status, setStatus, enable, disable };
}

/** VAPID keys are base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
