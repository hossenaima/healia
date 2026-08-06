import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { friendSummaries } from "@/lib/friends";
import { PageTitle } from "@/components/page-title";
import { FriendsPanel } from "@/components/friends-panel";
import { Encouragements } from "@/components/encouragements";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [friends, incoming, outgoing, notes] = await Promise.all([
    friendSummaries(user.id),
    prisma.friendship.findMany({
      where: { addresseeId: user.id, status: "pending" },
      include: { requester: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: user.id, status: "pending" },
      include: { addressee: { select: { name: true } } },
    }),
    prisma.encouragement.findMany({
      where: { toId: user.id },
      include: { from: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <PageTitle>Friends</PageTitle>
      <p className="mt-2 text-sm text-ink-muted">
        Cheer each other on. Friends see your weigh-ins and streak — never your
        meals.
      </p>

      <Encouragements
        notes={notes.map((n) => ({
          id: n.id,
          from: n.from.name,
          body: n.body,
          unread: n.readAt === null,
          at: n.createdAt.toISOString(),
        }))}
      />

      <FriendsPanel
        friends={friends}
        incoming={incoming.map((r) => ({ id: r.id, name: r.requester.name }))}
        outgoing={outgoing.map((r) => ({ id: r.id, name: r.addressee.name }))}
        units={user.units}
      />
    </>
  );
}
