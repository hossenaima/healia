import { redirect } from "next/navigation";
import { currentUser, hasAnyUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

/**
 * Everything behind the PIN shares this frame.
 *
 * The header and the tab bar live here rather than inside each page, which is
 * what makes switching tabs feel like switching tabs: they stay mounted, so a
 * tap only swaps the content below them. When they were part of every page,
 * every navigation tore down the whole chrome and rebuilt it, and the tab you
 * pressed stayed unlit until the server answered.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  // The count only decides where to send a stranger, so it stays off the path
  // of every request from someone already signed in.
  if (!user) redirect((await hasAnyUser()) ? "/login" : "/signup");

  // A cheer nobody notices is a cheer that did not happen, and Friends is the
  // one tab with something that arrives while you are elsewhere.
  const [requests, unread] = await Promise.all([
    prisma.friendship.count({
      where: { addresseeId: user.id, status: "pending" },
    }),
    prisma.encouragement.count({ where: { toId: user.id, readAt: null } }),
  ]);

  return (
    <>
      <header className="sticky top-0 z-20 glass !rounded-none !shadow-none md:bg-transparent md:backdrop-blur-none">
        {/* Baseline, not centre: the wordmark is larger than the pair on the
            right, and centring three different sizes leaves none of them on a
            shared line. */}
        <div className="mx-auto flex max-w-2xl items-baseline justify-between gap-3 px-5 py-4 md:px-6">
          <span className="font-cond text-lg font-bold tracking-tight">
            Helia
          </span>
          <div className="flex min-w-0 items-baseline gap-4">
            {/* Whose log this is — the app holds more than one. Stated, not
                emphasised: it is context, and the only action here is Lock. */}
            <span className="min-w-0 truncate text-sm text-ink-muted">
              {user.name}
            </span>
            {/* `contents` so the button is the flex item. Wrapped in a form it
                was laid out as one, and sat two pixels below the name. */}
            <form action={logoutAction} className="contents">
              <button
                type="submit"
                className="shrink-0 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                Lock
              </button>
            </form>
          </div>
        </div>
      </header>

      <Nav waiting={requests + unread} />

      {/* Bottom padding clears the fixed mobile nav bar. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-7 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:pb-16">
        {children}
      </main>
    </>
  );
}
