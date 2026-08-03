import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import { PinForm } from "@/components/pin-form";

// Auth state and the log itself change per request; nothing here may be
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  if (!(await isSetupComplete())) redirect("/setup");

  const { next } = await props.searchParams;
  const target = typeof next === "string" ? next : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <div className="settle">
        <p className="eyebrow">Locked</p>
        <h1 className="mt-1 font-cond text-3xl font-bold tracking-tight">
          Healia
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter your PIN to see your log.
        </p>

        <PinForm action={loginAction} mode="login" next={target} />
      </div>
    </main>
  );
}
