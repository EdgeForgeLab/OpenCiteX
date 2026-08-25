# OpenCiteX documentation

OpenCiteX is a self-hosted **GEO** (Generative Engine Optimization) radar. It asks AI search engines the kinds of questions a buyer would ask, then scores whether they **mention** your brand and **cite** your domain.

Keys stay on your server (BYOK). One admin password. No SaaS markup.

| You want to… | Read |
| --- | --- |
| Run it on a laptop | [Getting started](getting-started.md) |
| Set env vars and secrets | [Configuration](configuration.md) |
| Deploy to Vercel + Supabase | [Deployment](deployment.md) |
| Use Brands, Prompts, scans, and the dashboard | [Usage](usage.md) |
| Understand visibility, citation, intercept, rank | [Scoring](scoring.md) |
| See models, pacing, and the analysis model | [Engines](engines.md) |
| Recover a password or fix a failed migrate | [FAQ](faq.md) |

## What it measures

Each scan sends your **probes** to the engines you enable. OpenCiteX stores every answer, then computes:

- **AI visibility** — share of *unprompted* answers that mention you
- **Citation rate** — share of those answers that link your official domain
- **Interception** — category/scenario probes that name a competitor instead of you
- **Average rank** — how early your domain appears in the citation list

Dashboard rates **exclude probes that already name your brand**, so repeating your name does not inflate the score.

## Engines

| UI name | Model (scan) | Search |
| --- | --- | --- |
| Perplexity | `sonar` | Built in |
| OpenAI | `gpt-4o` | Web search tool |
| Gemini | `gemini-3.6-flash` | Google Search grounding |
| DeepSeek | `deepseek-chat` | Provider search (when available) |
| Qwen | `qwen-plus` | Provider search (when available) |

You only pay the providers. OpenCiteX never sees your keys in the browser after save.

## Status

MVP: one operator, many brands, no SSO or team roles. Fine for a laptop, a small VPS, or a Vercel hobby project.

## License

[MIT](../LICENSE)
