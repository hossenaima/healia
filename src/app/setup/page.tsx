import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/auth";
import { setupAction } from "@/app/actions/auth";
import { PinForm } from "@/components/pin-form";

// Auth state and the log itself change per request; nothing here may be
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await isSetupComplete()) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <div className="settle">
        <p className="eyebrow">First run</p>
        <h1 className="mt-1 font-cond text-3xl font-bold tracking-tight">
          Set up Healia
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Pick a PIN of 4 to 10 digits. It is the only thing standing between
          this log and anyone who finds the URL, so make it one you do not use
          elsewhere.
        </p>

        <PinForm action={setupAction} mode="setup" />
      </div>
    </main>
  );
}
