# Scoring

All dashboard **rates** (except where noted) use **unprompted** probes: the probe text does not name your brand. Brand-type probes are stored and visible in Results, but they do not lift AI visibility.

A result is **unprompted** when `promptCuesBrand` is false (name / aliases not in the probe string).

## Status labels (Results)

| Status | Meaning |
| --- | --- |
| **Cited** | A citation URL’s host matches your official domain |
| **Mentioned** | The answer names you (rules, and optionally the analysis model) but does not cite your domain |
| **Prompted** | The probe already named you, and the answer mentions you, without a domain citation |
| **Hidden** | No mention (and no citation of your domain) |

## AI visibility

**Unprompted answers that mention you / all unprompted answers.**

Mention matching:

- Your **brand name** and **full official domain** always count.
- **Aliases** count unless they are generic tokens (`ai`, `geo`, `seo`, engine names, …).
- Over-generic domain labels are ignored so “search.com”-style noise does not match.
- Short CJK names (for example two-character brands) can still match as whole tokens.

If rules find no mention and you selected an **analysis model**, that model may set mention to true. It never clears a rule hit. See [Engines](engines.md).

## Citation rate

**Unprompted answers that cite your domain / all unprompted answers.**

Citation is true only when a extracted HTTP(S) URL’s hostname matches the brand **target domain** (including subdomains). Competitor names in a URL host are a separate signal (intercept / competitor rank), not your citation.

**Rank** is 1-based position of your domain in the unique citation-host list (`0` if absent). **Average rank** averages ranks that are `> 0` on unprompted cited answers.

## Interception

**Market** probes = unprompted **Category** or **Scenario** probes.

An intercept is a market probe where **you are not mentioned** but a **competitor name** is attributed as taking the slot (from the answer / citations).

**Intercepted market probes / all market probes.**

**Top interceptor** is the competitor name that appears most often in those intercepts.

Competitor dashboard series reuse the same unprompted denominator; competitor “citations” match their **name** against citation hosts (they have no official domain in the brand record).

## How numbers are stored

| Surface | Data |
| --- | --- |
| KPI cards | Latest `Result` per `promptId + engine` for the brand |
| Trend + provider list | Each finished scan (`Job`) with `completed > 0`; mention rates snapshotted and/or recomputed from that job’s results |

Raw rows always include `engine`, so you can filter in Results even when a chart is aggregated.

## Scan pipeline (short)

1. Browser queues `prompt × engine`.
2. `POST /api/run` with the prompt id and engine — **no API keys in the body**.
3. Server decrypts workspace keys, calls the engine, writes `Result` (text, URLs, mention, citation, rank).
4. On job complete/cancel/fail, job-level metrics (including competitors) are persisted for history.
