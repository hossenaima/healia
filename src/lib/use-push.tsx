"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  subscribeAction,
  unsubscribeAction,
} from "@/app/actions/notifications";

export type PushSupport =
  | "checking"
  | "ready"
  | "needs-install" // iOS Safari outside a Home Screen app
  | "unsupported";

type PushState = {
  support: PushSupport;
  subscribed: boolean;
  busy: boolean;
  status: string | null;
  setStatus: (s: string | null) => void;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
};

const PushContext = createContext<PushState | null>(null);

/**
 * One answer to "is this device subscribed", shared by everything that asks.
 *
 * The header bell and the Settings panel used to run this check
 * independently, and could land on different answers for the same device —
 * the bell reading off while Settings read on. Two async probes of the same
 * flaky thing will disagree eventually; one probe cannot.
 */
export function PushProvider({ children }: { children: React.ReactNode }) {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const probe = useCallback(async () => {
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
      setSupport(iOS && !standalone ? "needs-install" : "unsupported");
      return;
    }

    let reg = await navigator.serviceWorker.getRegistration();

    // `getRegistration()` can resolve empty early in a page load even though a
    // worker is registered and this device is subscribed — which is what made
    // the bell and Settings disagree. A granted permission means we almost
    // certainly registered before, so it is worth waiting for activation
    // rather than concluding "off". Raced, because `ready` never resolves when
    // nothing is registered at all.
    if (!reg && Notification.permission === "granted") {
      reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 3000)),
      ]);
    }

    setSubscribed(Boolean(await reg?.pushManager.getSubscription()));
    setSupport("ready");
  }, []);

  useEffect(() => {
    void probe();
    // Permission and subscription can change while this tab sits in the
    // background — revoked in browser settings, or turned on elsewhere.
    const recheck = () => {
      if (document.visibilityState === "visible") void probe();
    };
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, [probe]);

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
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <PushContext.Provider
      value={{ support, subscribed, busy, status, setStatus, enable, disable }}
    >
      {children}
    </PushContext.Provider>
  );
}

export function usePush(): PushState {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used inside <PushProvider>");
  return ctx;
}

/** VAPID keys are base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
