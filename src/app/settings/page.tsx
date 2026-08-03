import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getEstimator } from "@/lib/ai/estimator";
import { fromLbs } from "@/lib/units";
import { Shell } from "@/components/shell";
import { GoalForm, PinChangeForm } from "@/components/settings-forms";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { units } = user;
  const aiEnabled = getEstimator().available;

  return (
    <Shell user={user} title="Settings">
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
            {aiEnabled ? "On." : "Off."} Estimation runs through Claude using
            the key in your server environment.
          </p>
          {!aiEnabled && (
            <p className="mt-2 text-sm text-ink-muted">
              Set <code className="tnum text-xs">ANTHROPIC_API_KEY</code> where
              the app is hosted, then restart it.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">PIN</h2>
        <PinChangeForm />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Data</h2>
        <div className="mt-4 rounded-xl border border-rule bg-surface p-5">
          <Link href="/backfill" className="text-sm underline underline-offset-2">
            Add past weigh-ins
          </Link>
          <p className="mt-1 text-sm text-ink-muted">
            Type or paste weigh-in history from another app.
          </p>
        </div>
      </section>
    </Shell>
  );
}

function display(lbs: number | null, units: Parameters<typeof fromLbs>[1]) {
  return lbs === null ? null : Math.round(fromLbs(lbs, units) * 10) / 10;
}
