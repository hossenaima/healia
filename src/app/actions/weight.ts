"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isDayKey } from "@/lib/dates";
import { parseBackfillText } from "@/lib/backfill";
import { toLbs } from "@/lib/units";

export type ActionResult = { ok: boolean; error?: string; saved?: number };

// Sanity bounds in pounds. Catches a kg/lb mix-up or a slipped decimal point
// before it lands in the chart and skews every axis.
const MIN_LBS = 40;
const MAX_LBS = 1000;

const dayKey = z.string().refine(isDayKey, "Not a valid date.");

const entrySchema = z.object({
  date: dayKey,
  weight: z.coerce
    .number({ message: "Enter a number." })
    .positive("Weight must be greater than zero."),
  note: z.string().trim().max(500).optional(),
});

export async function saveWeightAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();

  const parsed = entrySchema.safeParse({
    date: formData.get("date"),
    weight: formData.get("weight"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { units } = await getSettings();
  const weightLbs = toLbs(parsed.data.weight, units);

  if (weightLbs < MIN_LBS || weightLbs > MAX_LBS) {
    return { ok: false, error: `That weight looks off — check the units.` };
  }

  const note = parsed.data.note?.length ? parsed.data.note : null;

  // One weigh-in per day: re-submitting the same date corrects it.
  await prisma.weightEntry.upsert({
    where: { date: parsed.data.date },
    update: { weightLbs, note },
    create: { date: parsed.data.date, weightLbs, note },
  });

  revalidatePath("/");
  return { ok: true, saved: 1 };
}

export async function deleteWeightAction(formData: FormData) {
  await requireAuth();

  const date = String(formData.get("date") ?? "");
  if (!isDayKey(date)) return;

  await prisma.weightEntry.delete({ where: { date } }).catch(() => {
    // Already gone — deleting twice from a stale page is not an error.
  });

  revalidatePath("/");
}

// --- Bulk backfill ---------------------------------------------------------

export async function backfillAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();

  const text = String(formData.get("entries") ?? "");
  if (!text.trim()) return { ok: false, error: "Nothing to import." };

  const { rows, errors } = parseBackfillText(text);
  if (rows.length === 0) {
    return { ok: false, error: errors[0] ?? "No entries found." };
  }

  const { units } = await getSettings();

  const converted = rows.map((r) => ({
    date: r.date,
    weightLbs: toLbs(r.weight, units),
  }));

  const outOfRange = converted.find(
    (r) => r.weightLbs < MIN_LBS || r.weightLbs > MAX_LBS,
  );
  if (outOfRange) {
    return {
      ok: false,
      error: `${outOfRange.date} has an out-of-range weight — check the units.`,
    };
  }

  await prisma.$transaction(
    converted.map((r) =>
      prisma.weightEntry.upsert({
        where: { date: r.date },
        update: { weightLbs: r.weightLbs },
        create: { date: r.date, weightLbs: r.weightLbs },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/backfill");

  return {
    ok: true,
    saved: converted.length,
    error: errors.length ? `Skipped ${errors.length} line(s): ${errors[0]}` : undefined,
  };
}
