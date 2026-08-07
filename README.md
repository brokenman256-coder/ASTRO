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

- **Backend + database**: Railway. One project, two services - the Node
  backend (`backend/railway.json` configures the build/start commands and
  runs `prisma migrate deploy` on every start) and a Postgres plugin, with
  `DATABASE_URL` linked between them from Railway's dashboard.
- **Frontend**: Netlify. `netlify.toml` at the repo root points Netlify at
  `frontend/` and uses the official Next.js runtime plugin. Set
  `NEXT_PUBLIC_API_URL` in Netlify's env vars to the Railway backend's public
  URL + `/api`.

After the backend is deployed, run `npm run seed` from Railway's shell (or
locally against the same `DATABASE_URL`) to create the initial admin account.
