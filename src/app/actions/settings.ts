"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPin, requireAuth, verifyPin } from "@/lib/auth";
import { toLbs } from "@/lib/units";

export type SettingsResult = { ok: boolean; error?: string; message?: string };

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v > 0), "Enter a number.");

const settingsSchema = z.object({
  units: z.enum(["lb", "kg"]),
  goalWeight: optionalNumber,
  startWeight: optionalNumber,
  heightInches: optionalNumber,
});

export async function saveSettingsAction(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  await requireAuth();

  const parsed = settingsSchema.safeParse({
    units: formData.get("units"),
    goalWeight: formData.get("goalWeight") ?? "",
    startWeight: formData.get("startWeight") ?? "",
    heightInches: formData.get("heightInches") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { units, goalWeight, startWeight, heightInches } = parsed.data;

  // Goal and start weights are typed in the unit selected on this same form, so
  // they convert against the incoming unit rather than the previously saved one.
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      units,
      goalWeightLbs: goalWeight === null ? null : toLbs(goalWeight, units),
      startWeightLbs: startWeight === null ? null : toLbs(startWeight, units),
      heightInches,
    },
    create: {
      id: 1,
      units,
      goalWeightLbs: goalWeight === null ? null : toLbs(goalWeight, units),
      startWeightLbs: startWeight === null ? null : toLbs(startWeight, units),
      heightInches,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}

const PIN_RULE = /^\d{4,10}$/;

export async function changePinAction(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  await requireAuth();

  const current = String(formData.get("currentPin") ?? "");
  const next = String(formData.get("newPin") ?? "");
  const confirm = String(formData.get("confirmPin") ?? "");

  if (!PIN_RULE.test(next)) return { ok: false, error: "PIN must be 4–10 digits." };
  if (next !== confirm) return { ok: false, error: "The two PINs do not match." };

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.pinHash || !settings?.pinSalt) {
    return { ok: false, error: "No PIN is set." };
  }

  if (!(await verifyPin(current, settings.pinHash, settings.pinSalt))) {
    return { ok: false, error: "Current PIN is incorrect." };
  }

  const { hash, salt } = await hashPin(next);
  await prisma.settings.update({
    where: { id: 1 },
    data: { pinHash: hash, pinSalt: salt },
  });

  return { ok: true, message: "PIN updated." };
}
