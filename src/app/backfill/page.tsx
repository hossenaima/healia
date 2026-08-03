import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Shell } from "@/components/shell";
import { BackfillForm } from "@/components/backfill-form";

export default async function BackfillPage() {
  if (!(await isAuthenticated())) redirect("/login");

  const { units } = await getSettings();

  return (
    <Shell eyebrow="Section 01 — Readings" title="Add past entries">
      <p className="mt-4 text-sm text-ink-muted">
        Type or paste the weigh-ins you want to keep from Noom. A date that
        already has an entry is overwritten, so you can re-import safely.
      </p>

      <BackfillForm units={units} />

      <Link
        href="/"
        className="eyebrow mt-8 inline-block transition-colors hover:!text-ink"
      >
        ← Back to weight
      </Link>
    </Shell>
  );
}
