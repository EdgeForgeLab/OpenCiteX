import { extractHttpUrls } from "@/lib/citations";
import { formatProviderError } from "@/lib/engines/perplexity";
import type { EngineOutput } from "@/lib/types";

type OpenAIResponse = {
  output_text?: string;
  output?: unknown[];
  error?: { message?: string };
};

function collectOpenAICitations(payload: OpenAIResponse) {
  const urls = extractHttpUrls(payload);
  const fromAnnotations: string[] = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.type === "url_citation" && typeof record.url === "string") {
      fromAnnotations.push(record.url);
    }
    Object.values(record).forEach(visit);
  };

  visit(payload.output);
  return Array.from(new Set([...fromAnnotations, ...urls]));
}

function collectOpenAIText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const chunks: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.type === "output_text" && typeof record.text === "string") {
      chunks.push(record.text);
    }
    if (typeof record.text === "string" && record.type === "text") {
      chunks.push(record.text);
    }
    Object.values(record).forEach(visit);
  };
  visit(payload.output);
  return chunks.join("\n").trim();
}

async function callResponsesApi(apiKey: string, prompt: string, withInclude: boolean) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      input: prompt,
      ...(withInclude ? { include: ["web_search_call.action.sources"] } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

export async function queryOpenAI(apiKey: string, prompt: string): Promise<EngineOutput> {
  let result = await callResponsesApi(apiKey, prompt, true);

  if (!result.ok && result.status === 400) {
    result = await callResponsesApi(apiKey, prompt, false);
  }

  if (!result.ok) {
    const fallback = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Answer with specific brand and product names. Include source URLs inline when you can.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const fallbackBody = await fallback.text();
    if (!fallback.ok) {
      throw new Error(formatProviderError("OpenAI", result.status, result.body));
    }
    const data = JSON.parse(fallbackBody) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { engine: "openai", text, citations: extractHttpUrls(text) };
  }

  const payload = JSON.parse(result.body) as OpenAIResponse;
  if (payload.error?.message) {
    throw new Error(`OpenAI error: ${payload.error.message}`);
  }

  const text = collectOpenAIText(payload);
  return {
    engine: "openai",
    text,
    citations: collectOpenAICitations(payload),
  };
}
