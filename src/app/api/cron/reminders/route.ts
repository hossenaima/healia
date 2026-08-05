import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dayKeyIn, isValidTimezone, todayIn } from "@/lib/dates";
import { pushToUser } from "@/lib/push";

/**
 * Reminder sweep. Meant to be called every hour — see `.github/workflows` —
 * because "8am" is a different instant for every account, so a once-a-day
 * schedule could only ever serve one timezone.
 *
 * Safe to call as often as anything likes. Each pass sends only to people
 * whose chosen local hour it currently is, who have not already logged, and
 * who have not already been reminded today. Every scheduler that can reach
 * this route is at-least-once, so that last condition is what stands between
 * a retry and a second buzz in someone's pocket.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const candidates = await prisma.user.findMany({
    where: { reminderHour: { not: null }, pushSubscriptions: { some: {} } },
    select: {
      id: true,
      timezone: true,
      reminderHour: true,
      lastRemindedOn: true,
    },
  });

  let notified = 0;
  let skippedAlreadyLogged = 0;
  let skippedAlreadySent = 0;

  for (const user of candidates) {
    const zone = isValidTimezone(user.timezone) ? user.timezone : "UTC";
    const localHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        hour12: false,
      }).format(now),
    );
    if (localHour !== user.reminderHour) continue;

    const today = dayKeyIn(now, zone);
    if (user.lastRemindedOn === today) {
      skippedAlreadySent++;
      continue;
    }

    const already = await prisma.weightEntry.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { date: true },
    });
    if (already) {
      skippedAlreadyLogged++;
      continue;
    }

    const result = await pushToUser(user.id, {
      title: "Morning weigh-in",
      body: "A few seconds now keeps the line going.",
      url: "/",
      tag: "weigh-in",
    });
    if (result.sent > 0) {
      notified++;
      await prisma.user.update({
        where: { id: user.id },
        data: { lastRemindedOn: today },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    notified,
    skippedAlreadyLogged,
    skippedAlreadySent,
    at: todayIn("UTC"),
  });
}
