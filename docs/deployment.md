# Deployment

## Vercel + Supabase

1. Import [the GitHub repo](https://github.com/edgeforgelab/OpenCiteX) in Vercel (or use the Deploy button on the README).
2. Create a Supabase project and copy the Postgres URIs ([Configuration](configuration.md)).
3. In Vercel → Settings → Environment Variables, set at least:
   - `DATABASE_URL` — pooled URI for the app
   - `ENCRYPTION_KEY` — `openssl rand -hex 32`
   - Optionally `DIRECT_URL` — direct URI (you will use it for migrate)
4. Deploy.

**Do not** store provider API keys in Vercel env.

### Apply database migrations

Vercel’s default build is `prisma generate && next build`. That does **not** create tables.

The first time you deploy (and whenever a release adds `prisma/migrations/…`), apply migrations yourself.

**Easiest: from your laptop**, with the **direct** connection string (not PgBouncer port `6543`):

```bash
cd OpenCiteX
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=YOUR_SCHEMA" npx prisma migrate deploy
```

Use the same `schema` query param as production if you are not on `public`.

Why a direct URL: Prisma migrate needs a real Postgres session (locks). A transaction-mode pooler often fails or hangs.

You do **not** run this inside the Vercel dashboard. There is no “run npx” button. Either:

- Run the command locally against production Postgres (above), or
- Change the Vercel **Build Command** so every deploy migrates first:

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy && npx prisma generate && next build
```

Set `DIRECT_URL` in Vercel if you use that build command. If `DIRECT_URL` is missing, the build will fail.

### After the app is up

1. Open `https://your-deployment/setup` and save the recovery code.
2. Sign in → **API Keys** → paste BYOK keys.
3. **Brands** → add a brand → **Dashboard** → Run scan.

If the instance is on the public internet, put it behind your usual access control (Vercel Deployment Protection, a VPN, or similar). Encryption at rest is not a firewall.

## Node + Docker Postgres (VPS)

On the server:

```bash
docker compose up -d
cp .env.example .env
# set ENCRYPTION_KEY and DATABASE_URL
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Point a reverse proxy at the Node process. Keep `.env` off the public repo.

## Seed

`npx prisma db seed` creates the MetaCitex sample brand **only if no brand exists**. Optional on production.

## Updating

```bash
git pull
npm ci
npx prisma migrate deploy   # when new migration folders landed
npm run build               # or let Vercel rebuild
```
