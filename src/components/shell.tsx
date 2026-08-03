import { Nav } from "@/components/nav";
import { logoutAction } from "@/app/actions/auth";

export function Shell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-rule bg-surface md:bg-transparent">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 md:px-6">
          <span className="font-cond text-lg font-bold tracking-tight">
            Healia
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="eyebrow transition-colors hover:!text-ink"
            >
              Lock
            </button>
          </form>
        </div>
      </header>

      <Nav />

      {/* Bottom padding clears the fixed mobile nav bar. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-7 md:px-6 md:pb-16">
        <div className="settle">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 font-cond text-3xl font-bold tracking-tight">
            {title}
          </h1>
        </div>
        {children}
      </main>
    </>
  );
}
