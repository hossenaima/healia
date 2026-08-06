import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getEstimator } from "@/lib/ai/estimator";
import { fromLbs } from "@/lib/units";
import { PageTitle } from "@/components/page-title";
import { GoalForm, PinChangeForm } from "@/components/settings-forms";
import { NotificationSettings } from "@/components/notification-settings";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { units } = user;
  const aiEnabled = getEstimator().available;
  const deviceCount = await prisma.pushSubscription.count({
    where: { userId: user.id },
  });

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <section className="mt-6">
        <h2 className="eyebrow">Goal &amp; targets</h2>
        <GoalForm
          units={units}
          goalWeight={display(user.goalWeightLbs, units)}
          startWeight={display(user.startWeightLbs, units)}
          heightInches={user.heightInches}
          calorieTarget={user.calorieTarget}
          proteinTargetG={user.proteinTargetG}
          fiberTargetG={user.fiberTargetG}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Calorie estimation</h2>
        <div className="mt-4 rounded-xl border border-rule bg-surface p-5">
          <p className="text-sm">
            {aiEnabled ? "On." : "Off."} Estimation runs through Gemini using the
            key in your server environment.
          </p>
          {!aiEnabled && (
            <p className="mt-2 text-sm text-ink-muted">
              Set <code className="tnum text-xs">GEMINI_API_KEY</code> where
              the app is hosted, then restart it.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Notifications</h2>
        <NotificationSettings
          publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
          notifyWeighIn={user.notifyWeighIn}
          notifyFriends={user.notifyFriends}
          reminderHour={user.reminderHour}
          deviceCount={deviceCount}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">PIN</h2>
        <PinChangeForm />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Data</h2>
        <div className="mt-4 rounded-xl border border-rule bg-surface p-5">
          <Link href="/calendar" className="text-sm underline underline-offset-2">
            Open the calendar
          </Link>
          <p className="mt-1 text-sm text-ink-muted">
            Log or correct any day, and import an Apple Health export.
          </p>
        </div>
      </section>
    </>
  );
}

function display(lbs: number | null, units: Parameters<typeof fromLbs>[1]) {
  return lbs === null ? null : Math.round(fromLbs(lbs, units) * 10) / 10;
}
