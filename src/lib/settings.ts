import "server-only";

import { prisma } from "@/lib/db";
import type { Units } from "@/lib/units";

export type AppSettings = {
  goalWeightLbs: number | null;
  startWeightLbs: number | null;
  heightInches: number | null;
  units: Units;
};

/** Reads the singleton settings row, creating it on first access. */
export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return {
    goalWeightLbs: row.goalWeightLbs,
    startWeightLbs: row.startWeightLbs,
    heightInches: row.heightInches,
    units: row.units === "kg" ? "kg" : "lb",
  };
}
