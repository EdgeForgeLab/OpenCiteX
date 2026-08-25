import { extractHttpUrls } from "@/lib/citations";
import { formatProviderError } from "@/lib/engines/perplexity";
import type { EngineId, EngineOutput } from "@/lib/types";
import { unique } from "@/lib/utils";

export async function queryChatCompletions(input: {
  engine: EngineId;
  label: string;
  apiKey: string;
  url: string;
  model: string;
  prompt: string;
  extra?: Record<string, unknown>;
}): Promise<EngineOutput> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        {
          role: "system",
          content:
            "Answer with specific brand and product names. Include source URLs inline when you can.",
        },
        { role: "user", content: input.prompt },
      ],
      ...input.extra,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(formatProviderError(input.label, response.status, body));
  }

  const data = JSON.parse(body) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return {
    engine: input.engine,
    text,
    citations: unique([...extractHttpUrls(data), ...extractHttpUrls(text)]),
  };
}

export async function queryDeepSeek(apiKey: string, prompt: string): Promise<EngineOutput> {
  return queryChatCompletions({
    engine: "deepseek",
    label: "DeepSeek",
    apiKey,
    url: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    prompt,
  });
}

export async function queryQwen(apiKey: string, prompt: string): Promise<EngineOutput> {
  return queryChatCompletions({
    engine: "qwen",
    label: "Qwen",
    apiKey,
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
    prompt,
    extra: { enable_search: true },
  });
}
