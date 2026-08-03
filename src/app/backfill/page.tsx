import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { BackfillForm } from "@/components/backfill-form";
import { HealthImport } from "@/components/health-import";

export default async function BackfillPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <Shell user={user} title="Add past entries">
      <p className="mt-4 text-sm text-ink-muted">
        Bring in weigh-ins from before you started here. A date that already has
        an entry is overwritten, so importing twice is safe.
      </p>

      <section className="mt-6">
        <h2 className="eyebrow">Import</h2>
        <HealthImport units={user.units} />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Or type them in</h2>
        <BackfillForm units={user.units} />
      </section>

      <Link
        href="/"
        className="eyebrow mt-8 inline-block transition-colors hover:!text-ink"
      >
        ← Back to weight
      </Link>
    </Shell>
  );
}
