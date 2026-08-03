import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAnyUser, signupAllowed } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import { PinForm } from "@/components/pin-form";
import { AuthBackdrop } from "@/components/auth-backdrop";

// Auth state changes per request; nothing here may be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  if (!(await hasAnyUser())) redirect("/signup");

  const { next } = await props.searchParams;
  const target = typeof next === "string" ? next : undefined;
  const canSignUp = await signupAllowed();

  return (
    <main className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <AuthBackdrop />
      <div className="settle">
        <p className="eyebrow">Locked</p>
        <h1 className="mt-1 font-cond text-3xl font-bold tracking-tight">
          Healia
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Sign in to see your log.
        </p>

        <PinForm action={loginAction} mode="login" next={target} />

        {canSignUp && (
          <p className="mt-6 text-sm text-ink-muted">
            No account yet?{" "}
            <Link href="/signup" className="underline underline-offset-2">
              Create one
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
