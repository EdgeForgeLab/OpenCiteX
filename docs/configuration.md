# Configuration

Copy `.env.example` to `.env` locally, or set the same names in Vercel / your host.

**Do not** put Perplexity, OpenAI, Gemini, DeepSeek, or Qwen API keys in env. Paste them in **API Keys** after login. The server encrypts them with AES-256-GCM.

## Required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres URI used by the running app (Prisma Client) |
| `ENCRYPTION_KEY` | 64-character hex (`openssl rand -hex 32`). Encrypts BYOK keys. Also signs the session cookie if `AUTH_SECRET` is unset |

Rotating `ENCRYPTION_KEY` makes previously stored provider keys unreadable. Paste the keys again on API Keys after a rotation.

## Optional

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Session HMAC secret. Defaults to `ENCRYPTION_KEY` |
| `DIRECT_URL` | Direct (non-pooled) Postgres URI. Documented for Supabase **migrations**. The schema currently reads `DATABASE_URL` only — see [Deployment](deployment.md) |
| `NEXT_PUBLIC_APP_URL` | Public origin for canonical URLs, `robots.txt`, and `sitemap.xml`. Local default `http://localhost:3000`. Official site: `https://opencitex.com` |

## Local Docker

`.env.example` matches `docker-compose.yml`:

```env
DATABASE_URL="postgresql://opencitex:opencitex@localhost:5432/opencitex?schema=public"
```

## Supabase

Use **two** URLs when you can:

1. **Pooled** (often port `6543`, `pgbouncer=true`) as `DATABASE_URL` for the Next.js app — better for serverless.
2. **Direct / session** (often port `5432`) when you run `prisma migrate deploy`.

If your project uses a dedicated schema (for example `opencitex`), keep `?schema=...` consistent on both URLs.

Example (placeholders only):

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

## Prisma migrations

`npx prisma migrate deploy` applies every folder under `prisma/migrations/` in order. That is the supported way to create tables. `npm run build` only runs `prisma generate`; it does **not** migrate.

After you pull a release that added new files under `prisma/migrations/`, run migrate again against a **direct** Postgres connection. Details: [Deployment](deployment.md).
