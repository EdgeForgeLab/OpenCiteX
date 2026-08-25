import { formatProviderError } from "@/lib/engines/perplexity";
import { ANALYZER_MODELS, type ProviderId } from "@/lib/types";

const SYSTEM = `You classify whether an AI-search answer mentions a target brand.
Reply with JSON only: {"mentioned": boolean}
mentioned=true if the answer names the brand, a listed alias, or clearly refers to that company (including the official domain).
Do not treat competitors as the brand. If unsure, mentioned=false.`;

function parseMentioned(text: string): boolean | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { mentioned?: unknown };
    return typeof parsed.mentioned === "boolean" ? parsed.mentioned : null;
  } catch {
    return null;
  }
}

function userPrompt(input: {
  brandName: string;
  aliases: string[];
  targetDomain: string;
  competitors: string[];
  text: string;
}) {
  return [
    `Brand: ${input.brandName}`,
    `Official domain: ${input.targetDomain}`,
    `Aliases: ${input.aliases.join(", ") || "(none)"}`,
    `Competitors (not the brand): ${input.competitors.join(", ") || "(none)"}`,
    "",
    "Answer to classify:",
    input.text.slice(0, 12_000),
  ].join("\n");
}

async function chatCompletionsJson(input: {
  label: string;
  url: string;
  apiKey: string;
  model: string;
  user: string;
  extra?: Record<string, unknown>;
}) {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: input.user },
      ],
      ...input.extra,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(formatProviderError(input.label, response.status, body));
  }
  const data = JSON.parse(body) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function geminiJson(apiKey: string, user: string) {
  const model = ANALYZER_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${SYSTEM}\n\n${user}` }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(formatProviderError("Gemini", response.status, body));
  }
  const data = JSON.parse(body) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`Gemini error: ${data.error.message}`);
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

export async function classifyBrandMention(input: {
  engine: ProviderId;
  apiKey: string;
  brandName: string;
  aliases: string[];
  targetDomain: string;
  competitors: string[];
  text: string;
}): Promise<boolean | null> {
  const user = userPrompt(input);
  const model = ANALYZER_MODELS[input.engine];
  try {
    let text = "";
    switch (input.engine) {
      case "gemini":
        text = await geminiJson(input.apiKey, user);
        break;
      case "openai":
        text = await chatCompletionsJson({
          label: "OpenAI",
          url: "https://api.openai.com/v1/chat/completions",
          apiKey: input.apiKey,
          model,
          user,
        });
        break;
      case "deepseek":
        text = await chatCompletionsJson({
          label: "DeepSeek",
          url: "https://api.deepseek.com/chat/completions",
          apiKey: input.apiKey,
          model,
          user,
        });
        break;
      case "qwen":
        text = await chatCompletionsJson({
          label: "Qwen",
          url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
          apiKey: input.apiKey,
          model,
          user,
        });
        break;
      case "perplexity":
        text = await chatCompletionsJson({
          label: "Perplexity",
          url: "https://api.perplexity.ai/chat/completions",
          apiKey: input.apiKey,
          model,
          user,
          extra: { response_format: undefined },
        });
        break;
      default:
        return null;
    }
    return parseMentioned(text);
  } catch {
    return null;
  }
}