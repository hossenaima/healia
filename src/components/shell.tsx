import { Nav } from "@/components/nav";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function Shell({
  user,
  title,
  children,
}: {
  user: Pick<SessionUser, "name">;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="bg-surface/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4 md:px-6">
          <span className="font-cond text-lg font-bold tracking-tight">
            Healia
          </span>
          <div className="flex min-w-0 items-center gap-3">
            {/* Whose log this is — the app holds more than one. */}
            <span className="eyebrow truncate !text-ink-muted">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="eyebrow transition-colors hover:!text-ink"
              >
                Lock
              </button>
            </form>
          </div>
        </div>
      </header>

      <Nav />

      {/* Bottom padding clears the fixed mobile nav bar. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-7 md:px-6 md:pb-16">
        <h1 className="settle font-cond text-[2rem] font-bold leading-none tracking-tight">
          {title}
        </h1>
        {children}
      </main>
    </>
  );
}
