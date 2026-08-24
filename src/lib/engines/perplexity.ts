import { extractHttpUrls } from "@/lib/citations";
import type { EngineOutput } from "@/lib/types";

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

export async function queryPerplexity(apiKey: string, prompt: string): Promise<EngineOutput> {
  const response = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant. Answer with current, specific recommendations and name real products, brands, and websites when relevant.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(formatProviderError("Perplexity", response.status, body));
  }

  const data = JSON.parse(body) as {
    citations?: string[];
    choices?: { message?: { content?: string } }[];
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  const citations = Array.isArray(data.citations) && data.citations.length > 0
    ? data.citations
    : extractHttpUrls(data);

  return { engine: "perplexity", text, citations };
}

export function formatProviderError(provider: string, status: number, body: string) {
  const snippet = body.replace(/\s+/g, " ").slice(0, 280);
  return `${provider} request failed (${status}): ${snippet || "no response body"}`;
}
