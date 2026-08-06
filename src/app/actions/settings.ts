"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPin, requireUser, verifyPin } from "@/lib/auth";
import { toLbs } from "@/lib/units";
import { isValidTimezone } from "@/lib/dates";

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
  calorieTarget: optionalNumber,
  proteinTargetG: optionalNumber,
  fiberTargetG: optionalNumber,
});

export async function saveSettingsAction(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await requireUser();

  const parsed = settingsSchema.safeParse({
    units: formData.get("units"),
    goalWeight: formData.get("goalWeight") ?? "",
    startWeight: formData.get("startWeight") ?? "",
    heightInches: formData.get("heightInches") ?? "",
    calorieTarget: formData.get("calorieTarget") ?? "",
    proteinTargetG: formData.get("proteinTargetG") ?? "",
    fiberTargetG: formData.get("fiberTargetG") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const {
    units,
    goalWeight,
    startWeight,
    heightInches,
    calorieTarget,
    proteinTargetG,
    fiberTargetG,
  } = parsed.data;

  // Goal and start weights are typed in the unit selected on this same form, so
  // they convert against the incoming unit rather than the previously saved one.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      units,
      goalWeightLbs: goalWeight === null ? null : toLbs(goalWeight, units),
      startWeightLbs: startWeight === null ? null : toLbs(startWeight, units),
      heightInches,
      calorieTarget: calorieTarget === null ? null : Math.round(calorieTarget),
      proteinTargetG: proteinTargetG === null ? null : Math.round(proteinTargetG),
      fiberTargetG: fiberTargetG === null ? null : Math.round(fiberTargetG),
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}

const PIN_RULE = /^\d{4,10}$/;

export async function changePinAction(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await requireUser();

  const current = String(formData.get("currentPin") ?? "");
  const next = String(formData.get("newPin") ?? "");
  const confirm = String(formData.get("confirmPin") ?? "");

  if (!PIN_RULE.test(next)) return { ok: false, error: "PIN must be 4–10 digits." };
  if (next !== confirm) return { ok: false, error: "The two PINs do not match." };

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row) return { ok: false, error: "Account not found." };

  if (!(await verifyPin(current, row.pinHash, row.pinSalt))) {
    return { ok: false, error: "Current PIN is incorrect." };
  }

  const { hash, salt } = await hashPin(next);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash: hash, pinSalt: salt },
  });

  return { ok: true, message: "PIN updated." };
}

/**
 * Switch the display unit on its own.
 *
 * Weights are always stored in pounds, so nothing is converted here — every
 * figure on the page is rendered through `fromLbs`, and re-rendering with a
 * different unit is the whole change. That is also why the chart and the
 * numbers cannot disagree: there is one value and one conversion.
 */
export async function setUnitsAction(units: "lb" | "kg"): Promise<void> {
  const me = await requireUser();
  if (units !== "lb" && units !== "kg") return;

  await prisma.user.update({ where: { id: me.id }, data: { units } });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/friends");
  revalidatePath("/settings");
}

/**
 * Keep the account's timezone matching the browser it is being used from.
 *
 * It used to be captured only at sign-in, which sounded sufficient and was
 * not: sessions last 90 days, so an account created before this field existed
 * kept the column default indefinitely, and someone who moves does not sign in
 * again to tell us. A wrong zone here is not cosmetic — it files weigh-ins
 * under the wrong day and fires the morning reminder at the wrong hour.
 *
 * Called on load and a no-op unless the two actually differ.
 */
export async function syncTimezoneAction(timezone: string): Promise<void> {
  const me = await requireUser();

  if (!isValidTimezone(timezone) || timezone === me.timezone) return;

  await prisma.user.update({ where: { id: me.id }, data: { timezone } });
  revalidatePath("/", "layout");
}
