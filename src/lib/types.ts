import type { Engine, PromptCategory } from "@prisma/client";

export const PROVIDER_IDS = ["perplexity", "openai", "gemini", "deepseek", "qwen"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type ApiKeys = Record<ProviderId, string>;
export type KeyHints = Record<ProviderId, string | null>;
export type EngineId = Engine;

export function emptyKeys(): ApiKeys {
  return {
    perplexity: "",
    openai: "",
    gemini: "",
    deepseek: "",
    qwen: "",
  };
}

export function emptyHints(): KeyHints {
  return {
    perplexity: null,
    openai: null,
    gemini: null,
    deepseek: null,
    qwen: null,
  };
}

export type QueueItem = {
  id: string;
  promptId: string;
  promptText: string;
  engine: EngineId;
};

export type QueueStatus = "idle" | "queued" | "running" | "success" | "error";

export type QueueProgress = {
  item: QueueItem;
  status: QueueStatus;
  error?: string;
};

export type ParsedVisibility = {
  is_mentioned: boolean;
  has_citation: boolean;
  rank_position: number;
  cited_domains: string[];
};

export type EngineOutput = {
  engine: EngineId;
  text: string;
  citations: string[];
};

export type BrandInput = {
  name: string;
  targetDomain: string;
  aliases: string[];
  competitors: string[];
  industryCategory?: string | null;
  description?: string | null;
  language: string;
};

export type PromptInput = {
  text: string;
  category: PromptCategory;
};

export const ENGINE_META: Record<
  EngineId,
  { label: string; model: string; accent: string; placeholder: string; docs: string }
> = {
  perplexity: {
    label: "Perplexity",
    model: "sonar",
    accent: "text-foreground",
    placeholder: "pplx-...",
    docs: "https://www.perplexity.ai/settings/api",
  },
  openai: {
    label: "OpenAI",
    model: "gpt-4o",
    accent: "text-foreground",
    placeholder: "sk-...",
    docs: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "Gemini",
    model: "gemini-3.6-flash",
    accent: "text-foreground",
    placeholder: "AIza...",
    docs: "https://aistudio.google.com/apikey",
  },
  deepseek: {
    label: "DeepSeek",
    model: "deepseek-chat",
    accent: "text-foreground",
    placeholder: "sk-...",
    docs: "https://platform.deepseek.com/api_keys",
  },
  qwen: {
    label: "Qwen",
    model: "qwen-plus",
    accent: "text-foreground",
    placeholder: "sk-...",
    docs: "https://bailian.console.aliyun.com/",
  },
};

export const CATEGORY_META: Record<PromptCategory, { label: string; dotClass: string }> = {
  brand: { label: "Brand", dotClass: "bg-blue-500" },
  category: { label: "Category", dotClass: "bg-violet-500" },
  competitor: { label: "Competitor", dotClass: "bg-red-500" },
  scenario: { label: "Scenario", dotClass: "bg-teal-500" },
};

export const PROBE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
] as const;

export type ProbeLanguage = (typeof PROBE_LANGUAGES)[number]["id"];

export function probeLanguage(value: string | null | undefined): ProbeLanguage {
  const code = value?.trim().toLowerCase() ?? "";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("es")) return "es";
  return "en";
}

export function probeLanguageLabel(value: string | null | undefined) {
  const id = probeLanguage(value);
  return PROBE_LANGUAGES.find((item) => item.id === id)?.label ?? "English";
}

export const KEYS_STORAGE_KEY = "opencitex.byok.keys";
export const ACTIVE_BRAND_KEY = "opencitex.activeBrandId";
export const ACTIVE_PROJECT_KEY = "opencitex.activeProjectId";
export const QUEUE_DELAY_MS = 850;
export const DEFAULT_PACE_MS = 1000;
export const MIN_PACE_SEC = 0;
export const MAX_PACE_SEC = 60;

export type ProviderPaceMs = Record<ProviderId, number>;

export function emptyPaceMs(): ProviderPaceMs {
  return {
    perplexity: DEFAULT_PACE_MS,
    openai: DEFAULT_PACE_MS,
    gemini: DEFAULT_PACE_MS,
    deepseek: DEFAULT_PACE_MS,
    qwen: DEFAULT_PACE_MS,
  };
}

export function normalizePaceMs(value: unknown): ProviderPaceMs {
  const next = emptyPaceMs();
  if (!value || typeof value !== "object") return next;
  const raw = value as Record<string, unknown>;
  for (const id of PROVIDER_IDS) {
    const ms = Number(raw[id]);
    if (!Number.isFinite(ms)) continue;
    next[id] = Math.round(Math.min(MAX_PACE_SEC * 1000, Math.max(MIN_PACE_SEC * 1000, ms)));
  }
  return next;
}

/** Chat models used when classifying scan answers. No web search. */
export const ANALYZER_MODELS: Record<ProviderId, string> = {
  perplexity: "sonar",
  openai: "gpt-4o-mini",
  gemini: "gemini-3.6-flash",
  deepseek: "deepseek-chat",
  qwen: "qwen-plus",
};

export function normalizeAnalyzer(value: unknown): ProviderId | null {
  if (typeof value !== "string") return null;
  return PROVIDER_IDS.includes(value as ProviderId) ? (value as ProviderId) : null;
}
