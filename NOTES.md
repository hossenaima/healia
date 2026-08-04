# Helia — build notes

Running record of what was built, what was decided, and why. Kept in the repo
so the reasoning survives the conversation it came from.

---

## What Helia is

A personal health log for a small number of people. Two daily habits: a
morning weigh-in and meal logging.

Live at `git@github.com:hossenaima/helia.git`.

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | One deployable unit; server actions avoid a separate API layer |
| Database | Supabase Postgres via Prisma 7 | Stateless app → deploys anywhere including Vercel |
| Auth | Single PIN per account, signed cookie | No accounts service for an app with two users |
| AI | Google Gemini (`@google/genai`) | Estimates a meal's calories and macros from plain text; sits behind one interface |
| Charts | Recharts | |
| Type | Manrope | Geometric and even-width; Nunito read as cartoonish once heavy, which is where the big figures live. Capped at weight 700 |
| Auth screen visuals | ShaderGradient (three/r3f) | Dynamically imported so the daily pages never load it |

## Decisions worth remembering

**Days are `"YYYY-MM-DD"` strings, not timestamps.** A morning weigh-in belongs
to a calendar day in the user's timezone. Storing it as a UTC instant makes
entries jump days across DST and travel. `APP_TIMEZONE` resolves "today" on the
server.

**Weights are always stored in pounds.** The `units` setting only changes
display and how typed input is read.

**The chart's y-axis is scaled to the weights, never to the goal.** Forcing a
distant goal into the domain squashed the trace into the top third and hid the
day-to-day movement that is the reason to look. The goal line draws only when
it can share the frame; otherwise it is stated as text.

**The 7-day mean walks calendar days, not logged ones.** A gap in logging must
not compress the window and exaggerate a swing.

**Portion share and broth-left are applied at read time**, not baked into the
stored estimate, so correcting a share later needs no re-estimate. Sodium is cut
harder than calories on broth-left, because that is where it lives.

**Targets are entered by hand, never derived.** Mifflin-St Jeor can be off by
hundreds of calories for an individual, and a wrong target would quietly skew
the budget, the progress bars, and every suggestion. Blank targets hide those
features rather than guessing.

**Apple Health parsing happens in the browser.** The export zip is ~10MB but
`export.xml` inflates past 200MB — far beyond a serverless request body. Only
the extracted readings cross the network; the raw health data never leaves the
device.

**Glass is a lens, not a frost.** A blur alone reads as frosted plastic. The
refraction comes from an oversized `::after` carrying a copy of the page wash,
warped by an SVG `feTurbulence` + `feDisplacementMap`, clipped by the panel so
the outline stays crisp. Both the body wash and the copy are
`background-attachment: fixed`, which is what makes the copy line up with the
real backdrop — the trick does not survive removing that.

**`backdrop-filter: url(#filter)` does not work in Chrome.** SVG filters are
only honoured by `filter`, not `backdrop-filter`; the whole declaration is
dropped and computes to `none`. That is why the first attempt looked flat.

**Glass needs something behind it.** On a flat near-white page there is nothing
to refract, so the wash on `body` is load-bearing, not decoration.

**Colour is reserved for data.** An earlier pass gave each tile its own pastel;
it read as noise. The only saturated things on screen now are the trace, the
goal and the macro split — things that mean something.

**The calendar replaced a paste box.** Typing weigh-ins meant learning a date
format; tapping a day means the date is the thing you touch, so there is no
format to get wrong. Clearing the field and saving deletes the entry, which
avoids a separate delete affordance.

**A streak forgives today until the day is over.** Counting strictly from today
would show a broken streak every morning before you step on the scale.

**Accounts are isolated at the query level.** Every read filters on `userId`
and every delete is a scoped `deleteMany`, so a forged POST cannot reach another
account's data.

## Things that were tried and rejected

- **liquid-glass-js** — builds DOM imperatively (`new Button()`) and samples the
  page with `html2canvas`. Cannot wrap React children, and rasterising a
  figure-dense page on a phone would be slow. The glass look is CSS
  `backdrop-filter` instead.
- **liquid-logo** — a demo app, not a package.
- **SQLite on a volume** — worked, but tied hosting to a persistent disk.
  Replaced by Supabase once a host was being chosen anyway.
- **Deriving the calorie target from height/weight** — see above.
- **Manual portion / broth-left / read-off-a-label toggles on meals** — they
  asked the user to do arithmetic the estimator can infer from their own
  description, so they were removed along with their columns.
- **The typed backfill box** — replaced by the calendar.
- **A "what can I eat?" suggestion engine** — built, then removed. It was the
  least proven feature and the most machinery, and the point of this app is the
  daily logging habit. Kept out to stay minimal; the commit history has it if
  it is ever wanted back.

## Gotchas hit during the build

- `"use server"` files may export only async functions. Constants and parsers
  have to live in a separate module.
- Client components cannot import anything that pulls in `server-only`. Shared
  vocabulary has to live in a module the AI code does not own.
- A submit button's `name`/`value` is serialised natively by the browser.
  Setting React state in `onClick` to record which button was pressed **races
  the submission** and can send the previous value.
- **Gemini's structured output has a complexity budget.** A schema that is too
  rich is rejected outright with "the specified schema produces a constraint
  that has too many states for serving" — no partial result, no clue which part
  is at fault. A `maxItems` on a nested array is the worst offender and each
  nullable field doubles the state count again. Keep response schemas flat and
  fully required; cap array length in code instead.
- Prisma 7 uses driver adapters and `prisma.config.ts`; migrations read
  `DIRECT_URL` because the transaction pooler cannot run DDL.
- Supabase's direct endpoint (`db.<ref>.supabase.co`) is IPv6-only on the free
  tier. Use the pooler hostnames.

## Environment

See `.env.example`. `GEMINI_API_KEY` turns on meal estimation; without
it the app still works and the button explains why it is disabled.

## Operational notes

- **No PIN recovery by design.** `scripts/reset-pin.mjs` is the escape hatch;
  it re-hashes with the same scrypt parameters as `src/lib/auth.ts`, which the
  two must keep in step or a reset PIN will not verify.

## Open items

- Supabase project is in **us-west-1** while the user is US East — ~70ms of
  avoidable latency on every request. Cheap to fix while the database is small.
- Deployed at https://helia-plum.vercel.app (Vercel CLI, not Git-connected —
  pushes do not auto-deploy yet).
- Signup is still open; close it with `ALLOW_SIGNUP=false` once the second
  person has an account.
