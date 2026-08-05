"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ReminderResult = { ok: boolean; error?: string; message?: string };

/** Store a browser's push endpoint. Endpoints are unique, so re-subscribing
 *  from the same browser updates rather than duplicates. */
export async function subscribeAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ReminderResult> {
  const me = await requireUser();

  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { ok: false, error: "That subscription was incomplete." };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId: me.id, p256dh: sub.p256dh, auth: sub.auth },
    create: { userId: me.id, ...sub },
  });

  revalidatePath("/settings");
  return { ok: true, message: "This device will get reminders." };
}

export async function unsubscribeAction(endpoint: string) {
  const me = await requireUser();
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: me.id },
  });
  revalidatePath("/settings");
}

/** Null turns reminders off without forgetting the device. */
export async function setReminderHourAction(
  _prev: ReminderResult,
  formData: FormData,
): Promise<ReminderResult> {
  const me = await requireUser();

  const raw = String(formData.get("hour") ?? "");
  if (raw === "off") {
    await prisma.user.update({
      where: { id: me.id },
      data: { reminderHour: null },
    });
    revalidatePath("/settings");
    return { ok: true, message: "Reminders off." };
  }

  const hour = Number(raw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { ok: false, error: "Pick an hour." };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { reminderHour: hour },
  });

  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}
