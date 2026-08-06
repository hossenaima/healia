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
entries jump days across DST and travel.

**The zone is per account, not per server.** It is captured from the browser at
sign-in and refreshed on every sign-in, so the day boundary follows a person
when they travel. A single `APP_TIMEZONE` was wrong the moment a second person
joined from anywhere else; it survives only as a fallback.

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

**Itemise what the person can change, not what the dish is called.** If a
description says what went into something, each component gets its own line —
someone who used less granola needs a granola line to edit. A named restaurant
dish or a packaged bar stays whole, because splitting a Big Mac into bun, patty
and sauce is noise nobody can act on. The model collapses to the dish name
unless told this explicitly.

**An estimate you cannot argue with is just a number you have to trust.** Each
item carries the estimator's working — the portion it assumed, what it counted —
and every figure is editable. Correcting one scales its macros by the same
ratio, so the split stays honest without retyping four numbers, and flips the
item to `exact`, because once a person has adjusted it, it is their number.

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
- **A utility class must never set `display`.** `.eyebrow` set `display: block`
  to stop a label colliding with its input; because it is defined after the
  Tailwind import it silently beat `flex` everywhere the two were combined,
  which is what knocked the nav labels off centre. Callers that need block say
  so themselves.
- **`viewport-fit=cover` is required for `env(safe-area-inset-*)` to be
  non-zero on iPhone.** Without it the bottom bar sits under the home
  indicator and the padding intended to clear it does nothing.
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
- **iPhone only delivers web push to a Home Screen app**, never to a Safari tab
  — `PushManager` is simply absent there, with no way to feature-detect the
  reason. Settings checks for iOS plus non-standalone display and says to add
  Helia to the Home Screen, rather than showing a button that cannot work.
- Chrome refuses the Push API in incognito, so a Puppeteer
  `createBrowserContext()` cannot test subscribing — use the default context
  with a `userDataDir`.
- `pushManager.subscribe()` rejects for reasons the page cannot anticipate.
  It is wrapped, because an unhandled rejection there took the whole settings
  panel down with no message.

## Environment

See `.env.example`. `GEMINI_API_KEY` turns on meal estimation; without
it the app still works and the button explains why it is disabled.

## Look

- The neutral ramp is neutral. It used to carry a green cast at every step,
  which put a second green on screen arguing with the trace and read as olive
  rather than quiet. Colour now means data; everything else is graphite.
- Buttons are `.btn` plus `.btn-primary` / `.btn-quiet` / `.btn-soft` in
  `globals.css`, and small pills are `.chip`. Ten inline copies of the same
  string used to spell this out, every one uppercase and tracked wide — set
  against soft cards that read as shouting, and it was the loudest thing on a
  page whose whole point is calm.
- `.eyebrow` is 600. Nearly every label, tab and section heading wears it, and
  at 700 the interface shouted in unison. Bold is left for data and state.
- A disabled `.btn-primary` recedes to the sunk surface rather than dimming to
  40%: a full-width dark button at 40% is a grey slab, and a grey slab reads
  as broken rather than as "nothing to submit yet".
- The header row is baseline-aligned, and the Lock form is `display: contents`
  so the button is the flex item. Wrapped in a form it was laid out as one and
  sat two pixels below the account name.

## Navigation

- The header and tab bar live in `src/app/(app)/layout.tsx`, not in each page.
  When they were part of every page, a tab switch tore down the whole chrome
  and rebuilt it, so nothing on screen moved until the server answered — which
  is what "the tabs take a while" actually was.
- `(app)/loading.tsx` is what makes these dynamic routes prefetchable at all;
  without a loading file Next skips prefetching them entirely.
- The nav lights the pressed tab optimistically, because `usePathname` only
  changes once the route is ready. `useLinkStatus` adds a creeping hairline
  for the case where the prefetch has not landed.
- `currentUser()` is wrapped in React `cache()`: the layout and the page both
  ask, and without it that is two identical queries per navigation.

## Friends and notifications

- A friendship is one row with a `status`, not two mirrored rows. Both the
  requester and addressee indexes exist because both directions get queried.
- `friendSummaries()` reads weigh-ins and streaks only. No query on the friends
  path touches `Meal`, which is the boundary the feature promises in its own
  copy — keep it that way.
- `requestFriendAction` returns the same message whether or not the name
  exists, so the form cannot be used to discover who has an account.
- Notification kinds are per account (`notifyWeighIn`, `notifyFriends`), and
  `reminderHour` is only *when*, never *whether* — collapsing the two into a
  nullable hour meant turning reminders off also forgot the chosen time.
- The first device to subscribe switches both kinds on. Granting permission is
  the yes; a settings panel where everything is still off asks it twice. Only
  the first, so a second device cannot undo choices already made.
- Reminders need an **hourly** sweep, not a daily one: "8am" is a different
  instant for every account, so a once-a-day schedule can only ever serve one
  timezone. Vercel's Hobby plan caps crons at one run per day and rejects the
  deploy outright for anything faster, so the hourly trigger is a GitHub
  Actions workflow and the Vercel cron is only a daily backstop.
- Every scheduler that can reach that route is at-least-once, and two of them
  can overlap, so `User.lastRemindedOn` makes the route idempotent per day.
  Calling it repeatedly is safe by design — that is what lets a free scheduler
  drive it.
- `/api/cron/*` is exempt in `proxy.ts` — it authenticates with `CRON_SECRET`,
  and a redirect to `/login` would turn a failed cron into a silent 307.
- `/sw.js`, `/manifest.webmanifest`, and `/icon-*.png` are exempt too: the OS
  fetches them during install, outside any session.

## Units

- Weights are stored in pounds, always. `units` only decides how they are
  rendered, which is why the switch on the Weight tab cannot leave the chart
  and the figures disagreeing — there is one value and one conversion.
- Client inputs that mirror a server-rendered number have to follow it when it
  changes. `WeighInForm` used to seed state from a prop and keep it, so
  switching to kg left a pounds figure under a "kg" label. It now clears
  whenever the server sends a different value — which doubles as the receipt
  for a save — and shows the stored reading in the placeholder instead.
- The chart's y-axis width is derived from the widest label it will draw. A
  fixed 46px was fine for "180" and quietly cropped the leading digit off
  "180.4" once narrow ranges started getting a decimal.

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
- The steps-driven calorie bar is deferred, not dropped.
- The reminder workflow needs two GitHub repo secrets, `APP_URL` and
  `CRON_SECRET`. Without them the hourly sweep fails silently and only the
  daily Vercel backstop runs.
- Friend requests and notes push as well as showing a count on the Friends tab.
  `notifyFriendActivity` never throws into its caller: a push service being
  slow is not a reason for the request itself to fail.
