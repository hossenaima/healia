"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pushToUser } from "@/lib/push";

export type NotificationResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * Store a browser's push endpoint. Endpoints are unique, so re-subscribing
 * from the same browser updates the row rather than adding a second one.
 */
export async function subscribeAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<NotificationResult> {
  const me = await requireUser();

  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { ok: false, error: "That subscription was incomplete." };
  }

  const existing = await prisma.pushSubscription.count({
    where: { userId: me.id },
  });

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId: me.id, p256dh: sub.p256dh, auth: sub.auth },
    create: { userId: me.id, ...sub },
  });

  // Granting permission is the yes. Landing on a settings panel where every
  // kind is switched off would be asking the same question twice, so the
  // first device turns everything on — and only the first, so a later one
  // cannot undo choices already made here.
  if (existing === 0) {
    await prisma.user.update({
      where: { id: me.id },
      data: { notifyWeighIn: true, notifyFriends: true },
    });
  }

  revalidatePath("/settings");
  return { ok: true, message: "This device will get notifications." };
}

export async function unsubscribeAction(endpoint: string) {
  const me = await requireUser();
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: me.id },
  });
  revalidatePath("/settings");
}

/** Which kinds you want, and what time the morning one arrives. */
export async function setNotificationPrefsAction(input: {
  notifyWeighIn?: boolean;
  notifyFriends?: boolean;
  reminderHour?: number;
}): Promise<NotificationResult> {
  const me = await requireUser();

  const data: {
    notifyWeighIn?: boolean;
    notifyFriends?: boolean;
    reminderHour?: number;
  } = {};

  if (typeof input.notifyWeighIn === "boolean") {
    data.notifyWeighIn = input.notifyWeighIn;
  }
  if (typeof input.notifyFriends === "boolean") {
    data.notifyFriends = input.notifyFriends;
  }
  if (input.reminderHour !== undefined) {
    const hour = Number(input.reminderHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return { ok: false, error: "Pick an hour." };
    }
    data.reminderHour = hour;
  }

  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.user.update({ where: { id: me.id }, data });
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Push a notification to every device on this account, now.
 *
 * The only way to answer "will this actually reach my phone" without waiting
 * until tomorrow morning. It exercises the real path — VAPID signing, the push
 * service, the service worker — so a failure here is the same failure the
 * reminder would hit, and it reports how many devices it actually reached.
 */
export async function sendTestNotificationAction(): Promise<NotificationResult> {
  const me = await requireUser();

  const devices = await prisma.pushSubscription.count({ where: { userId: me.id } });
  if (devices === 0) {
    return { ok: false, error: "No devices set up yet — turn notifications on first." };
  }

  const { sent, pruned } = await pushToUser(me.id, {
    title: "Helia test",
    body: "Notifications are working. This is what a reminder looks like.",
    url: "/",
    tag: `test-${Date.now()}`,
  });

  if (sent === 0) {
    return {
      ok: false,
      error:
        pruned > 0
          ? `That device's subscription had expired and has been removed — turn notifications on again.`
          : "The push service accepted nothing. Check the server's VAPID keys.",
    };
  }

  revalidatePath("/settings");
  return {
    ok: true,
    message: `Sent to ${sent} device${sent === 1 ? "" : "s"}. It should arrive in a second or two.`,
  };
}
