# Getting started

This path runs **Postgres in Docker** and the **Next.js app on Node**. You need Docker Desktop (or Engine), Node 20+, and npm.

## 1. Clone and env

```bash
git clone https://github.com/edgeforgelab/OpenCiteX.git
cd OpenCiteX
cp .env.example .env
```

Create a 32-byte secret (64 hex characters) and put it in `.env`:

```bash
openssl rand -hex 32
```

```env
DATABASE_URL="postgresql://opencitex:opencitex@localhost:5432/opencitex?schema=public"
ENCRYPTION_KEY="<paste the hex here>"
```

`ENCRYPTION_KEY` encrypts BYOK keys at rest and signs the admin cookie unless you set `AUTH_SECRET`.

## 2. Database and app

`docker compose` starts **Postgres only**. The app still runs with `npm run dev`.

```bash
docker compose up -d
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

`/` is the product landing page. For first run, open [http://localhost:3000/setup](http://localhost:3000/setup). After you have a password, sign in at [`/login`](http://localhost:3000/login).

## 3. First-run checklist

1. **`/setup`** — create the admin password. Save the **recovery code** (shown once).
2. **API Keys** (`/byok`) — paste at least one provider key. Keys are encrypted in Postgres and never sent back to the browser.
3. **Brands** — add a brand (name, official domain, aliases, competitors, category, language). Saving generates Brand / Category / Competitor / Scenario probes.
4. **Dashboard** — pick the brand and **Run scan**.

The seed creates a **MetaCitex** example brand. Edit or delete it under Brands.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:up` | Start local Postgres |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed the example brand (skipped if a brand already exists) |
| `npm run auth:reset` | Delete the admin row so `/setup` can run again |

## Next

- [Configuration](configuration.md) — all environment variables
- [Usage](usage.md) — day-to-day product flow
- [Deployment](deployment.md) — Vercel + Supabase
