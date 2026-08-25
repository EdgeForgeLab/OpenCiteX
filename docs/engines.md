# Engines

Scans only run providers that have a **saved key**. Run scan lists the rest as “no key”.

## Scan models

| Provider | Scan model | Notes |
| --- | --- | --- |
| Perplexity | `sonar` | Native search |
| OpenAI | `gpt-4o` | Web search enabled for scans |
| Gemini | `gemini-3.6-flash` | Google Search grounding |
| DeepSeek | `deepseek-chat` | OpenAI-compatible API |
| Qwen | `qwen-plus` | DashScope-compatible API + search when configured |

These IDs live in code (`ENGINE_META`). If a provider retires a model, OpenCiteX must ship an update — there is no UI to type an arbitrary model for scans.

## Call interval

On **API Keys**, each provider has an interval in **seconds** (`0`–`60`, default 1s). The client waits that long after a call before the next item for that provider. Raise it if you hit 429s.

## Analysis model (optional)

Used **after** a scan answer is stored, only when rule-based mention is false.

| Setting | Behavior |
| --- | --- |
| Rules only | No extra LLM call |
| A saved provider | Chat completion **without** search. OpenAI uses `gpt-4o-mini`; others use the table in code (`ANALYZER_MODELS`) |

The classifier returns JSON `{"mentioned": boolean}`. `true` can **add** a mention; it cannot undo a rule-based mention. Citations are never taken from this call.

Pick a cheap provider. The extra request counts against that key’s quota.

## Keys and security

- Encrypted at rest (`ENCRYPTION_KEY`).
- Hint (last 4 characters) may be shown in the UI; the full key is not returned to the browser.
- `/api/run` decrypts only for that request.

Get keys from the provider consoles (linked from the API Keys placeholders): Perplexity, OpenAI, Google AI Studio, DeepSeek, Alibaba Cloud Bailian / DashScope.
