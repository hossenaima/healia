# Healia

A personal health log: a morning weigh-in with a progress chart, and a daily
meal log that can estimate calories from a plain-language description.

Built for one person. There are no accounts — the whole app sits behind a single
PIN, and all data lives in one SQLite file on the server.

## Sections

**Weight** (`/`) — log this morning's weight, see the trace descend toward your
goal, and review or correct past entries. Re-submitting a date overwrites it, so
there is exactly one weigh-in per day.

**Add past entries** (`/backfill`) — type or paste weigh-in history from Noom or
anywhere else, one per line. Dates are read in several formats:

```
2026-01-04, 172.4
1/11/2026, 171.2
Jan 18 2026  170.8
```

The count and date range update as you type, and unreadable lines are called out
before you import.

**Meals** (`/meals`) — log what you ate per day. Either type a calorie number
yourself, or press **Estimate calories** to have the description broken into
items with calories and macros. Estimated items are labelled, so you always know
which figures came from a model rather than from you.

**Settings** (`/settings`) — goal weight, start weight, units (lb or kg), and
your PIN.

## Running it locally

```bash
npm install
npx prisma migrate dev     # creates dev.db
npm run dev                # http://localhost:3000
```

The first visit sends you to `/setup` to choose a PIN. Nothing is reachable
before that PIN exists.

## Environment

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite path, e.g. `file:./dev.db`. In production, point it at a persistent volume. |
| `SESSION_SECRET` | in production | Random string, 16+ characters. Signs the session cookie. The app refuses to start in production without it. |
| `APP_TIMEZONE` | no | Your timezone, e.g. `America/New_York`. Decides which calendar day an entry belongs to when the server runs in UTC. Defaults to `America/New_York`. |
| `OPENAI_API_KEY` | no | Turns on calorie estimation. Without it the app still works; the estimate button is disabled and says why. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini`. Change it to use a different model. |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploying

The app needs a host that keeps a **persistent disk**, because the database is a
file. Railway, Fly.io, and Render all work; Vercel does not, since its
filesystem is ephemeral.

1. Create the service from this repo and let it run `npm run build`.
2. Mount a volume and point `DATABASE_URL` at it, e.g. `file:/data/healia.db`.
3. Set `SESSION_SECRET`, and `APP_TIMEZONE` if you are not on US Eastern.
4. Add `OPENAI_API_KEY` when you want calorie estimation on.

`npm run build` runs `prisma migrate deploy` first, so schema changes apply on
each deploy.

Once it is up, open it on your phone and add it to the home screen.

### Moving to hosted Postgres later

If you outgrow a single file, the change is small:

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Swap `@prisma/adapter-better-sqlite3` for `@prisma/adapter-pg` in
   `src/lib/db.ts`.
3. Point `DATABASE_URL` at the new database and run `npx prisma migrate dev`.

Nothing above the data layer refers to SQLite.

## Notes on the data model

Days are stored as `"YYYY-MM-DD"` strings rather than timestamps. A weigh-in
belongs to a calendar day in your timezone, and storing it as a UTC instant
makes entries jump days across DST and travel.

Weights are always stored in pounds. The `units` setting only changes how they
are displayed and how your typed input is read.
