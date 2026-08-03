"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  endSession,
  hashPin,
  isSetupComplete,
  startSession,
  verifyPin,
} from "@/lib/auth";

export type FormState = { error?: string };

const PIN_RULE = /^\d{4,10}$/;

export async function setupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Setup is only reachable while no PIN exists; once one does, this route
  // would otherwise let anyone overwrite it.
  if (await isSetupComplete()) {
    return { error: "Healia is already set up. Sign in with your PIN." };
  }

  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!PIN_RULE.test(pin)) return { error: "PIN must be 4–10 digits." };
  if (pin !== confirm) return { error: "The two PINs do not match." };

  const { hash, salt } = await hashPin(pin);
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { pinHash: hash, pinSalt: salt },
    create: { id: 1, pinHash: hash, pinSalt: salt },
  });

  await startSession();
  redirect("/");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/");

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.pinHash || !settings?.pinSalt) {
    redirect("/setup");
  }

  if (!(await verifyPin(pin, settings.pinHash, settings.pinSalt))) {
    return { error: "Incorrect PIN." };
  }

  await startSession();
  // Only allow same-site relative paths, so `?next=` cannot bounce elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
