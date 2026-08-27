# OpenCiteX

> Open-source **GEO** (Generative Engine Optimization) radar — see if AI search engines mention and cite your brand.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/edgeforgelab/OpenCiteX)

**OpenCiteX** is a privacy-first, BYOK monitor for Perplexity, OpenAI, Gemini, DeepSeek, and Qwen. It scores whether those engines mention your brand, cite your domain, or hand the answer to a competitor.

Self-hosted. Your keys. One admin password. No SaaS markup.

**Documentation:** [docs/](docs/README.md) — install, deploy, scoring, and FAQ.

<p align="center">
  <img src="docs/images/dashboard.png" alt="OpenCiteX visibility dashboard: AI visibility, citation rate, intercepts, trend, and per-provider mention rates" />
</p>

## Features

- **BYOK** — Perplexity, OpenAI, Gemini, DeepSeek, and Qwen keys are encrypted with AES-256-GCM in Postgres and never sent back to the browser
- **Optional analysis model** — pick one saved provider to catch brand mentions that string matching misses; citations stay URL-based
- **Multi-engine scans** — Perplexity `sonar`, OpenAI `gpt-4o` + web search, Gemini `gemini-3.6-flash` + Google Search grounding, DeepSeek `deepseek-chat`, Qwen `qwen-plus` + search
- **Visibility scoring** — unprompted mention rate, citation rate, category/scenario interception rate, and average citation rank
- **Prompt matrix** — each brand stores name, domain, aliases, competitors, category, and language; saving expands Brand / Category / Competitor / Scenario probes
- **Queue-friendly** — client-side sequential jobs with backoff, so a first scan does not burn rate limits or serverless timeouts
- **Deploy your way** — Vercel + Supabase, or Postgres in Docker and the app on Node

## Screenshots

Sequential BYOK scans, then every probe × provider in Results:

<p align="center">
  <img src="docs/images/scan.png" alt="Scan history: brand, providers, progress, and job status" />
</p>

<p align="center">
  <img src="docs/images/result.png" alt="Results table: probe type, engine, cited or mentioned status, and intercepts" />
</p>

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

`/` is the product landing page. First run: open [http://localhost:3000/setup](http://localhost:3000/setup). After that, sign in at [`/login`](http://localhost:3000/login).

1. **`/setup`** — admin password + recovery code (shown once)
2. **`/byok`** — paste Perplexity, OpenAI, Gemini, DeepSeek, and Qwen keys (shared across brands)
3. **`/brands`** — add brands; saving generates the 4-dimension probe set
4. **`/dashboard`** — pick a brand and run a sequential scan

The seed workspace includes a MetaCitex example brand. Change it under Brands.

For environment variables, Vercel migrations, scoring rules, and FAQ, see **[the docs](docs/README.md)**.

## Deploy on Vercel

Import the repo, set `DATABASE_URL` (pooled) and `ENCRYPTION_KEY`, then apply Prisma migrations with a **direct** Postgres URL. Step-by-step (including why `migrate deploy` is not part of `npm run build`): **[Deployment](docs/deployment.md)**.

Do **not** put provider API keys in Vercel env.

## Auth

Single operator, no email, no signup.

| Situation | What to do |
| --- | --- |
| Forgot the password | `/recover` with the recovery code |
| Lost password **and** recovery code | `npm run auth:reset`, then `/setup` again |

`auth:reset` clears only the admin record. Brands, prompts, results, and encrypted keys stay put.

If the instance is on the public internet, put it behind a reverse proxy, VPN, or similar. Encryption at rest is not a substitute.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `ENCRYPTION_KEY` | Yes | 64-char hex. Encrypts BYOK keys and signs the session cookie |
| `AUTH_SECRET` | Optional | Session HMAC secret. Defaults to `ENCRYPTION_KEY` |
| `DIRECT_URL` | Optional | Direct (non-pooled) Postgres URI for Prisma migrations on Supabase |
| `NEXT_PUBLIC_APP_URL` | Optional | Public origin for canonical URLs, robots.txt, and sitemap. Official site: `https://opencitex.com` |

Rotating `ENCRYPTION_KEY` makes previously stored API keys unreadable. Paste them again in Settings after a rotation.

## How a scan works

1. The dashboard queues `prompt × engine` jobs in the browser
2. Each job `POST`s `/api/run` with **no keys in the body**
3. The server decrypts workspace keys for that request, calls the engine, stores the answer and citation URLs
4. Mentions are scored with whole-word matching against the brand name, domain, and distinctive aliases. Generic terms such as GEO or AI are ignored. Citation is true only when a cited host matches the target domain
5. Dashboard rates only count **unprompted** probes (the prompt does not name the brand). Brand-named prompts can still be Cited if the engine links your domain; repeating the name is labeled Prompted, not cited

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

## Contact

[support@metacitex.com](mailto:support@metacitex.com)

## License

[MIT](LICENSE)
