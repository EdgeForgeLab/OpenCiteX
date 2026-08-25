# Usage

After [setup](getting-started.md), work from the signed-in shell. The left nav stays put; only the main pane changes.

## API Keys (`/byok`)

Workspace-wide. Every brand reuses the same keys.

- Paste a key per provider you want to scan. Status shows configured vs empty.
- **Interval** — seconds to wait after each call to that provider (`0`–`60`). Saved on blur. Use this to stay under rate limits.
- **Analysis model** — optional. If string matching does not find a mention, OpenCiteX can send the answer to one saved provider (no web search) and allow it to mark a mention. It cannot *remove* a mention the rules already found. Citations always stay URL-based. **Rules only** skips the extra call.

Clearing a key asks for confirmation. The raw key is never shown again after save.

## Brands (`/brands`)

Each brand has:

- Name and **official domain** (used for citation matching)
- **Aliases** — extra names that count as you
- **Competitors** — used for intercept scoring and the dashboard trend
- **Category** and **description** — feed generated probes
- **Probe language** — English, 中文, Français, Español

Creating a brand generates a starting set of probes. **Editing brand fields later does not rebuild probes.** Change wording on **Prompts**.

Deleting a brand cascades to its prompts, jobs, and results.

## Prompts (`/prompts`)

Probes sent during a scan. The page always has one brand selected (URL `brandId`, last used brand, or the first brand).

Types:

| Type | Typical role |
| --- | --- |
| Brand | Names you (excluded from dashboard rates) |
| Category | “What tools exist in this space?” |
| Competitor | “Alternatives to *rival*?” |
| Scenario | Job-to-be-done / how-to questions |

Add, edit, or delete probes. **Deleting a prompt deletes its stored results.**

Brand-named (Brand) probes are still useful to see whether engines link your domain when asked about you; they just do not count toward AI visibility.

## Dashboard (`/dashboard`)

Pick a brand, then **Run scan**.

KPI cards use the **latest result per prompt × engine** (not a historical average):

- AI visibility, citation rate, interception, average rank

Charts and the provider list use **completed scans** (jobs):

- **AI visibility** — your unprompted mention rate over time (solid) vs competitors (dashed)
- **Visibility by provider** — same mention rate, one row per engine, 7-day sparkline, latest %, change vs the previous scan that included that engine

The landing-page monitor graphic is **demo data**, not your workspace.

## Scan (`/scans`)

Each **Run scan** creates a **job**: selected engines × all probes for that brand, run **one after another in the browser**.

- Progress sits in a widget; you can open Scan for history.
- Stop cancels the remaining queue.
- Results attach to the job so the dashboard can plot a point per scan.

Keep the tab open while a scan runs. Closing it stops the client queue.

## Results (`/results`)

Every stored engine response. Filter by brand, provider, status (cited / mentioned / prompted / hidden), or scan.

Open a row for the raw answer. Official-domain URLs and in-text matches can be highlighted.

## Sign out

Bottom of the sidebar. Cookie session; there is no email magic-link.
