import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dayKeyIn, isValidTimezone, todayIn } from "@/lib/dates";
import { pushToUser } from "@/lib/push";

/**
 * Hourly reminder sweep.
 *
 * Runs every hour rather than once a day because "9am" means a different
 * instant for every account. Each pass asks what the local hour is for each
 * person and only notifies the ones whose chosen hour it currently is — and
 * only if they have not already logged, since a reminder to do something you
 * have done is just noise.
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
    select: { id: true, timezone: true, reminderHour: true },
  });

  let notified = 0;
  let skippedAlreadyLogged = 0;

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
    if (result.sent > 0) notified++;
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    notified,
    skippedAlreadyLogged,
    at: todayIn("UTC"),
  });
}
