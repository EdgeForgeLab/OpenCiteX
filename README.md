# OpenCiteX

> Open-source **GEO** (Generative Engine Optimization) radar — see if AI search engines mention and cite your brand.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/edgeforgelab/OpenCiteX)

**OpenCiteX** is a privacy-first, BYOK monitor for Perplexity, GPT-4o, and Gemini. It scores whether those engines mention your brand, cite your domain, or hand the answer to a competitor.

Self-hosted. Your keys. One admin password. No SaaS markup.

## Features

- **BYOK** — Perplexity / OpenAI / Gemini keys are encrypted with AES-256-GCM in Postgres and never sent back to the browser
- **Multi-engine scans** — Perplexity `sonar`, OpenAI `gpt-4o` + web search, Gemini `gemini-2.5-flash` + Google Search grounding
- **Visibility scoring** — mention rate, citation rate, and who intercepted the prompt when you are missing
- **Prompt library** — brand, category, competitor, and scenario probes; seed a starter set or add your own
- **Queue-friendly** — client-side sequential jobs with backoff, so a first scan does not burn rate limits or serverless timeouts
- **Deploy your way** — Vercel + Supabase, or Postgres in Docker and the app on Node

Gaps in the results table can be sent to [Metacitex](https://metacitex.com) to generate a fix.

## Stack

- **App** — Next.js 14 App Router, TypeScript
- **UI** — Tailwind CSS, shadcn-style components, Lucide, dark / light
- **Data** — Prisma + PostgreSQL (Docker locally, or Supabase)

## Quick start (local)

```bash
git clone https://github.com/edgeforgelab/OpenCiteX.git
cd OpenCiteX
cp .env.example .env
```

Create a 32-byte secret and put it in `.env`:

```bash
openssl rand -hex 32
```

```env
DATABASE_URL="postgresql://opencitex:opencitex@localhost:5432/opencitex?schema=public"
ENCRYPTION_KEY="<paste the hex here>"
```

`docker compose` starts **Postgres only**. Then run the app with Node:

```bash
docker compose up -d
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):

1. **`/setup`** — admin password + recovery code (shown once)
2. **`/settings`** — brand, domain, competitors, and API keys
3. **`/prompts`** — keep or edit the starter probes
4. **`/dashboard`** — run a sequential scan

The seed workspace is a MetaCitex example. Change it in Settings to your brand.

## Deploy on Vercel

1. Clone [this repo](https://github.com/edgeforgelab/OpenCiteX) with the Deploy button, or import it in Vercel
2. Attach Supabase Postgres: pooled URI as `DATABASE_URL`, direct URI as `DIRECT_URL`
3. Set `ENCRYPTION_KEY` (`openssl rand -hex 32`)
4. On release, run `npx prisma migrate deploy` against `DIRECT_URL`
5. Open the deployment → `/setup` → paste keys in Settings

Do **not** put provider API keys in Vercel env.

## Auth

Single operator, no email, no signup.

| Situation | What to do |
| --- | --- |
| Forgot the password | `/recover` with the recovery code |
| Lost password **and** recovery code | `npm run auth:reset`, then `/setup` again |

`auth:reset` clears only the admin record. Projects, prompts, results, and encrypted keys stay put.

If the instance is on the public internet, put it behind a reverse proxy, VPN, or similar. Encryption at rest is not a substitute.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `ENCRYPTION_KEY` | Yes | 64-char hex. Encrypts BYOK keys and signs the session cookie |
| `AUTH_SECRET` | Optional | Session HMAC secret. Defaults to `ENCRYPTION_KEY` |
| `DIRECT_URL` | Optional | Direct (non-pooled) Postgres URI for Prisma migrations on Supabase |

Rotating `ENCRYPTION_KEY` makes previously stored API keys unreadable. Paste them again in Settings after a rotation.

## How a scan works

1. The dashboard queues `prompt × engine` jobs in the browser
2. Each job `POST`s `/api/run` with **no keys in the body**
3. The server decrypts workspace keys for that request, calls the engine, stores the answer and citation URLs
4. `gpt-4o-mini` structured output (heuristic fallback without an OpenAI key) returns mention / citation / rank
5. Rows that are not mentioned or not cited show **Fix with Metacitex**

The landing-page monitor card is **demo data**, not a live scan.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:up` | Start local Postgres |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the example workspace |
| `npm run auth:reset` | Clear the admin password |

## Status

MVP for one brand on a laptop or a small VPS. Not multi-tenant: one admin, no SSO, no team roles.

## License

[MIT](LICENSE)
