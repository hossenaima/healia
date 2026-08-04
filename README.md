# Healia

A personal health log: a morning weigh-in with a progress chart, and a daily
meal log that can estimate calories from a plain-language description.

Built for one person. There are no accounts — the whole app sits behind a single
PIN, and all data lives in one Postgres database (Supabase).

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
yourself, or press **Estimate for me** to have the description broken into items with
calories, macros, fiber and sodium. Estimated items are labelled, so you always know
which figures came from a model rather than from you.

**Settings** (`/settings`) — goal weight, start weight, units (lb or kg), and
your PIN.

## Running it locally

```bash
npm install
cp .env.example .env       # then fill in the connection strings
npx prisma migrate deploy  # creates the tables
npm run dev                # http://localhost:3000
```

The first visit sends you to `/setup` to choose a PIN. Nothing is reachable
before that PIN exists.

## Environment

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **transaction pooler** URI, port `6543`, with `?pgbouncer=true`. Used by the app at runtime. |
| `DIRECT_URL` | yes | Supabase **session pooler** URI, port `5432`. Used only to run migrations — the transaction pooler cannot run DDL. |
| `SESSION_SECRET` | in production | Random string, 16+ characters. Signs the session cookie. The app refuses to start in production without it. |
| `APP_TIMEZONE` | no | Your timezone, e.g. `America/New_York`. Decides which calendar day an entry belongs to when the server runs in UTC. Defaults to `America/New_York`. |
| `GEMINI_API_KEY` | no | Google AI Studio key. Turns on calorie estimation and "What can I eat?". Without it the app still works; those buttons are disabled and say why. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash`. |
| `ALLOW_SIGNUP` | no | Set to `false` to close signup once everyone who needs an account has one. The first account is always allowed. |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploying

The app holds no local state, so any host works — Vercel included.

1. Import this repo and let it run `npm run build`.
2. Set `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET`, plus `APP_TIMEZONE`
   if you are not on US Eastern.
3. Add `GEMINI_API_KEY` when you want estimation and suggestions on.

`npm run build` runs `prisma migrate deploy` first, so schema changes apply on
each deploy.

Once it is up, open it on your phone and add it to the home screen.

Note that Supabase pauses free-tier projects after a stretch of inactivity.
Daily use avoids it, but after a long break you may need to resume the project
from the dashboard before the app can reach the database.

## Notes on the data model

Days are stored as `"YYYY-MM-DD"` strings rather than timestamps. A weigh-in
belongs to a calendar day in your timezone, and storing it as a UTC instant
makes entries jump days across DST and travel.

Weights are always stored in pounds. The `units` setting only changes how they
are displayed and how your typed input is read.

Supabase is used purely as a Postgres host. The app does not use Supabase Auth,
row-level security, or the JavaScript client — it connects over the Postgres
wire protocol through Prisma, so swapping to any other Postgres provider means
changing two environment variables and nothing else.
