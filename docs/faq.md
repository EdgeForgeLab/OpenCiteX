# FAQ

## I forgot the admin password

Open `/recover` and enter the recovery code from `/setup`. You set a new password.

## I lost the password and the recovery code

On a machine that can reach the database:

```bash
npm run auth:reset
```

Then open `/setup` again. This **only** deletes the admin row. Brands, prompts, results, and encrypted keys stay.

## Dashboard or Prisma errors about missing columns / `metrics`

The app is ahead of the database. Run [migrations](deployment.md#apply-database-migrations) against a **direct** Postgres URL.

## Run scan shows “no key” after I saved keys

Refresh after login, then open Run scan again. Keys load from `/api/credentials` once you are in the signed-in app. Saving on API Keys updates the same store.

## A provider is configured but every call fails

Check interval (rate limits), billing on the provider, and that the key is for the same account/console as the model table in [Engines](engines.md). Read the error on the Scan / Results row.

## Visibility is 0% but Results show my name

Those hits are probably **Brand** probes (prompt already contains your name). Dashboard rates ignore them. Use Category / Competitor / Scenario probes for unprompted visibility.

## Editing a brand did not change my probes

By design. Prompts are not regenerated on save. Edit them on **Prompts**.

## Can I run two scans at once?

No. One client queue. Start another after the current job finishes or you stop it.

## Is the homepage chart live?

No. The landing monitor is illustrative.

## Multi-user / SSO?

Not supported. One admin cookie for the instance.

## Where is the documentation on GitHub?

This folder: [`docs/`](https://github.com/edgeforgelab/OpenCiteX/tree/main/docs).
