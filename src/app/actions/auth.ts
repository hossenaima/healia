"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isValidTimezone } from "@/lib/dates";
import {
  endSession,
  hashPin,
  signupAllowed,
  startSession,
  toHandle,
  verifyPin,
} from "@/lib/auth";

export type FormState = { error?: string };

const PIN_RULE = /^\d{4,10}$/;
const NAME_RULE = /^[\p{L}\p{N} '._-]{2,30}$/u;

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await signupAllowed())) {
    return { error: "Signup is closed. Ask for an account to be created." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!NAME_RULE.test(name)) {
    return { error: "Use 2–30 letters or numbers for your name." };
  }
  if (!PIN_RULE.test(pin)) return { error: "PIN must be 4–10 digits." };
  if (pin !== confirm) return { error: "The two PINs do not match." };

  const handle = toHandle(name);
  if (await prisma.user.findUnique({ where: { handle } })) {
    return { error: "That name is taken. Pick another." };
  }

  const { hash, salt } = await hashPin(pin);
  const user = await prisma.user.create({
    data: { name, handle, pinHash: hash, pinSalt: salt, ...timezoneFrom(formData) },
  });

  await startSession(user.id);
  redirect("/");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/");

  const user = await prisma.user.findUnique({
    where: { handle: toHandle(name) },
  });

  // One message for both a missing account and a bad PIN, so this page cannot
  // be used to find out who has an account here.
  const rejected = { error: "That name and PIN do not match an account." };
  if (!user) return rejected;
  if (!(await verifyPin(pin, user.pinHash, user.pinSalt))) return rejected;

  // Refreshed on every sign-in, so the day boundary follows you when you travel.
  const tz = timezoneFrom(formData);
  if (tz.timezone && tz.timezone !== user.timezone) {
    await prisma.user.update({ where: { id: user.id }, data: tz });
  }

  await startSession(user.id);
  // Only same-site relative paths, so `?next=` cannot bounce elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/** The browser reports its own zone; anything unresolvable is ignored. */
function timezoneFrom(formData: FormData): { timezone?: string } {
  const tz = String(formData.get("timezone") ?? "").trim();
  return tz && isValidTimezone(tz) ? { timezone: tz } : {};
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
