import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/dates";
import { getSuggester } from "@/lib/ai/suggester";
import { mealNutrition, remainingCalories, sumNutrition } from "@/lib/nutrition";
import { Shell } from "@/components/shell";
import { EatForm } from "@/components/eat-form";

export const dynamic = "force-dynamic";

export default async function EatPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const date = serverToday();
  const [meals, dayLog] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, date },
      include: { items: true },
    }),
    prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    }),
  ]);

  const eaten = sumNutrition(meals.map(mealNutrition));
  const remaining = remainingCalories(
    user.calorieTarget,
    eaten.calories,
    dayLog?.activeBurnKcal ?? null,
  );

  return (
    <Shell user={user} title="What can I eat?">
      <p className="mt-3 text-sm text-ink-muted">
        Options that fit the calories you have left, filtered for how you want
        to feel afterwards.
      </p>

      <EatForm
        remaining={remaining}
        aiEnabled={getSuggester().available}
        hasTarget={user.calorieTarget !== null}
      />
    </Shell>
  );
}
