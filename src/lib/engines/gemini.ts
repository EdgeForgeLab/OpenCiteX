import { extractHttpUrls } from "@/lib/citations";
import { formatProviderError } from "@/lib/engines/perplexity";
import type { EngineOutput } from "@/lib/types";

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: {
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
    };
  }[];
  error?: { message?: string };
};

export async function queryGemini(apiKey: string, prompt: string): Promise<EngineOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(formatProviderError("Gemini", response.status, body));
  }

  const data = JSON.parse(body) as GeminiResponse;
  if (data.error?.message) {
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const candidate = data.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  const grounded =
    candidate?.groundingMetadata?.groundingChunks
      ?.map((chunk) => chunk.web?.uri)
      .filter((uri): uri is string => Boolean(uri)) ?? [];

  return {
    engine: "gemini",
    text,
    citations: grounded.length > 0 ? grounded : extractHttpUrls(data),
  };
}
