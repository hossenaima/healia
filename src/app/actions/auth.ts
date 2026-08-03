"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
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
    data: { name, handle, pinHash: hash, pinSalt: salt },
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

  await startSession(user.id);
  // Only same-site relative paths, so `?next=` cannot bounce elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
