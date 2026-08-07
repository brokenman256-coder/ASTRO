# Astro

An astrology platform with AI-powered predictions and palm reading, an
admin-managed astrologer roster bot, a bot-driven announcement system, and a
simulated QR wallet with admin approval.

## Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL via Prisma, JWT auth,
  Anthropic Claude for AI features.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS.

## Project layout

```
backend/    Express API, Prisma schema, business logic
frontend/   Next.js app (public site + admin dashboard)
```

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, secrets, etc. (see below)
npm install
npm run prisma:migrate   # creates tables
npm run seed              # creates the initial admin account + sample data
npm run dev                # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3000
```

## Feature guide

### Astrologer roster bot
Admin dashboard → **Astrologers**. "Bot: Add new astrologer" generates a
fresh profile (name, specialty, experience, photo, bio); "Bot: Retire
lowest-rated" auto-retires the weakest active profile, mirroring how apps
like AstroTalk rotate their listed astrologers. Admins can also add/retire
profiles manually.

**Auto-bot**: the same "Astrologers" page has an on/off toggle to run this
automatically on a schedule (default every 10 minutes) instead of manually.
When on, it adds one astrologer per interval; if the active roster is at its
configured cap (default 30), it retires the weakest profile first so the
list stays bounded. Photos are AI-generated photorealistic headshots via
`OPENAI_API_KEY` when set (falls back to a placeholder avatar otherwise) -
see the cost note in `backend/.env.example` before turning this on, since a
10-minute cadence with real image generation runs indefinitely and costs
real money per image. It's off by default; turn it on from the dashboard
once you're ready.

The scheduler runs in-process on Render; on Netlify Functions it instead
relies on an external pinger hitting `/scheduler-tick` (see the Deployment
section) since serverless functions can't run a timer between requests.

**Bulk-generate**: for building a large pool up front rather than growing it
one at a time, the same page has a "Bulk-generate astrologers" action -
create up to 2000 profiles in one go, using placeholder avatars only (no
per-image AI cost, unlike the live auto-bot). Combine this with **Featured
per day** (same settings panel as the auto-bot, default 100): the public
Astrologers page only ever shows that many at once, picked by a
date-seeded shuffle of the active pool - the same subset all day for every
visitor, a different subset the next day. So you can bulk-seed 1000 profiles
and users will always see a fresh-looking 100 without the full pool being
dumped on them at once. If you also run the live auto-bot afterward, raise
"Max active roster size" above your bulk pool size first, or it'll retire
bulk-created profiles down to whatever that cap is set to.

### AI predictions & palm reading
Powered by Claude via `ANTHROPIC_API_KEY` in `backend/.env`. Without a key
set, these endpoints return a clear "AI not configured" placeholder instead
of failing - the rest of the app still works. Predictions cover Daily,
Love, Career, Health, and General readings by zodiac sign; palm reading
accepts an uploaded photo and returns a reading based on what the model
observes in the image. This is an LLM-driven system prompted specifically
for strong, specific astrology/palmistry output - not a custom-trained model
(training one from scratch would need a large labeled dataset and dedicated
infrastructure).

### Remedies
Every prediction and palm reading automatically includes a "Remedy" section
when the reading touches on a struggle - a real, specific mantra or shloka
from the Bhagavad Gita, Vedas, or Upanishads, with practical instructions,
framed as a spiritual/wellness practice rather than a medical treatment.
There's also a dedicated **Remedies** page where a user can directly
describe what's troubling them (e.g. lack of focus, anxiety, career
blocks) and get a tailored remedy on demand.

### User data & admin visibility
Every prediction, palm reading (including the actual uploaded photo),
remedy, and wallet transaction is stored against the user who generated it.
Admin dashboard → **Users** lists every account; clicking one opens their
full history - all predictions, palm reading images, remedies, and wallet
transactions in one place. `passwordHash` is never returned, even to admins.

### Bot command center
Admin dashboard → **Bot Command Center**. Type an instruction in plain
language; AstroBot (Claude) rewrites it as a formal announcement, which you
preview before publishing to all users. Toggle **Autonomous** mode and the
bot instead generates and can publish its own independent astrological
insights/announcements without admin wording.

### Wallet
Users request a top-up, which generates a scan-to-pay style QR code and a
pending transaction. **No real payment gateway is connected** - scanning the
QR does not move real money. An admin must manually approve the request
(Admin dashboard → **Wallet Approvals**) before the balance is credited.
To go live, swap in a real gateway (e.g. Razorpay/Stripe) and update
`backend/src/services/wallet.service.ts` and the approval flow to verify a
real payment webhook instead of manual admin sign-off.

### Branding
Admin dashboard → **Branding**. Controls the app name, tagline, about text,
brand colors, and logo shown across the public site.

### Secret admin passage
There is no admin link anywhere in the public navigation. Access is a
two-factor gate:

1. On the **Info** page, click the small `·` mark at the bottom of the page
   5 times within 3 seconds. This reveals a passphrase prompt.
2. Enter the passphrase set as `ADMIN_ACCESS_PHRASE` in `backend/.env`
   (server-verified, rate-limited, never shipped in the client bundle).
3. A correct passphrase unlocks a short-lived (5 minute) gateway session,
   which is required in addition to a real admin username/password
   (seeded via `npm run seed`, using `SEED_ADMIN_USERNAME` /
   `SEED_ADMIN_PASSWORD`) to actually log in.

Change `ADMIN_ACCESS_PHRASE` and the seeded admin password before deploying,
and only share the passphrase with people who should have admin access.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list.

## Deployment

Two backend deploy targets are supported from the same codebase - pick one.

### Option A: everything on Netlify (two sites, no card anywhere)

- **Database**: Neon (free, no card). Create a project, copy the pooled
  connection string.
- **Backend**: a *second* Netlify site pointing at this same repo, with
  **Base directory** set to `backend`. It picks up `backend/netlify.toml`,
  which runs migrations + seeding at build time and deploys the Express app
  as a Netlify Function (`backend/netlify/functions/api.ts`, via
  `serverless-http`) behind a `/api/*` redirect - so it's reachable at the
  same `<site>.netlify.app/api/...` shape the frontend already expects.
  Env vars: same list as Option B below, set in this site's settings.
- **Astrologer auto-bot scheduler**: serverless functions have no persistent
  process for an in-process timer, so instead point a free external
  scheduler (e.g. cron-job.org, every 5-10 minutes) at
  `https://<backend-site>.netlify.app/scheduler-tick?secret=<SCHEDULER_SECRET>`.
  It's a no-op unless the bot's configured interval has actually elapsed, so
  pinging it more often than the interval is harmless.
- **Frontend**: the existing Netlify site from `netlify.toml` at the repo
  root (base `frontend/`). Set `NEXT_PUBLIC_API_URL` to the backend site's
  URL + `/api`.
- Caveat: file uploads (palm reading photos) go through Netlify's Lambda-style
  event format rather than a raw Node stream - this is the one area that
  hasn't been exercised against live Netlify infrastructure, so it's worth
  testing first after deploy. If it errors, that's the place to debug.

### Option B: Render (backend) + Neon (database) + Netlify (frontend)

- **Database**: Neon, same as above.
- **Backend**: Render (free tier, no card required for a free web service -
  double check the Instance Type is set to Free). `render.yaml` at the repo
  root is a Render Blueprint - importing the repo there auto-configures the
  build/start commands and prompts for env vars. The astrologer auto-bot
  runs in-process here (no external pinger needed), but the free plan spins
  down after inactivity, which pauses it until the next request wakes it -
  a free uptime pinger on `/api/health` keeps it running continuously.
- **Frontend**: same as Option A.

Both options use the same env vars: `DATABASE_URL`, `JWT_USER_SECRET`,
`JWT_ADMIN_SECRET`, `ADMIN_ACCESS_PHRASE`, `SEED_ADMIN_USERNAME`,
`SEED_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY` (optional), `OPENAI_API_KEY`
(optional). Option A also needs `SCHEDULER_SECRET`.

`backend/railway.json` is also included as a third alternative if you want
Railway instead (note: Railway requires a payment method on file even on
its free trial).
