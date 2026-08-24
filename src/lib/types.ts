import type { Engine, PromptCategory } from "@prisma/client";

export type ApiKeys = {
  perplexity: string;
  openai: string;
  gemini: string;
};

export type EngineId = Engine;

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

export type ProjectInput = {
  name: string;
  targetDomain: string;
  brandKeywords: string[];
  competitors: string[];
};

export type PromptInput = {
  text: string;
  category: PromptCategory;
};

export const ENGINE_META: Record<
  EngineId,
  { label: string; model: string; accent: string }
> = {
  perplexity: { label: "Perplexity", model: "sonar", accent: "text-foreground" },
  openai: { label: "OpenAI", model: "gpt-4o", accent: "text-foreground" },
  gemini: { label: "Gemini", model: "gemini-2.5-flash", accent: "text-foreground" },
};

export const CATEGORY_META: Record<PromptCategory, { label: string; dotClass: string }> = {
  brand: { label: "Brand", dotClass: "bg-blue-500" },
  category: { label: "Category", dotClass: "bg-violet-500" },
  competitor: { label: "Competitor", dotClass: "bg-red-500" },
  scenario: { label: "Scenario", dotClass: "bg-teal-500" },
};

export const KEYS_STORAGE_KEY = "opencitex.byok.keys";
export const ACTIVE_PROJECT_KEY = "opencitex.activeProjectId";
export const QUEUE_DELAY_MS = 850;
