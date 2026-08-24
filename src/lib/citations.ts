import { domainMatches, hostnameFromUrl, normalizeDomain, unique } from "@/lib/utils";
import type { EngineOutput } from "@/lib/types";

const GENERIC_TOKENS = new Set([
  "aeo",
  "ai",
  "api",
  "app",
  "brand",
  "chatgpt",
  "citation",
  "citations",
  "claude",
  "copilot",
  "gemini",
  "geo",
  "google",
  "gpt",
  "llm",
  "microsoft",
  "nlp",
  "openai",
  "perplexity",
  "search",
  "seo",
  "site",
  "visibility",
  "web",
]);

export function extractHttpUrls(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s"'<>)]+/gi) ?? [];
    bucket.push(...matches.map((url) => url.replace(/[.,;]+$/, "")));
    return bucket;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractHttpUrls(item, bucket);
    return bucket;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (
        (key === "url" || key === "uri" || key === "href" || key === "link") &&
        typeof nested === "string" &&
        nested.startsWith("http")
      ) {
        bucket.push(nested);
      }
      extractHttpUrls(nested, bucket);
    }
  }
  return bucket;
}

export function citationHosts(citations: string[]) {
  return unique(
    citations
      .map((citation) => hostnameFromUrl(citation))
      .filter((host): host is string => Boolean(host)),
  );
}

export function citationRank(citations: string[], targetDomain: string) {
  const hosts = citationHosts(citations);
  const index = hosts.findIndex((host) => domainMatches(host, targetDomain));
  return index >= 0 ? index + 1 : 0;
}

export function hasTargetCitation(citations: string[], targetDomain: string) {
  return citationRank(citations, targetDomain) > 0;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(haystack: string, needle: string) {
  const token = needle.trim().toLowerCase();
  if (token.length < 3) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, "i");
  return pattern.test(haystack);
}

function isGenericAlias(value: string) {
  const tokens = value
    .toLowerCase()
    .split(/[\s/_-]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => GENERIC_TOKENS.has(token) || token.length < 3);
}

export function brandAliases(brandName: string, keywords: string[], domain: string) {
  const host = normalizeDomain(domain);
  const slug = host.split(".")[0] ?? "";
  return unique(
    [brandName, host, slug, ...keywords]
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length >= 3 && !isGenericAlias(item)),
  );
}

export function textMentionsBrand(
  text: string,
  brandName: string,
  keywords: string[],
  domain: string,
) {
  const haystack = text.toLowerCase();
  return brandAliases(brandName, keywords, domain).some((needle) => hasToken(haystack, needle));
}

export function promptCuesBrand(
  promptText: string,
  brandName: string,
  keywords: string[],
  domain: string,
) {
  return textMentionsBrand(promptText, brandName, keywords, domain);
}

export function findInterceptor(input: {
  rawText: string;
  citations: string[];
  competitors: string[];
  isMentioned: boolean;
}) {
  if (input.isMentioned) return null;
  const haystack = `${input.rawText} ${input.citations.join(" ")}`.toLowerCase();
  for (const competitor of input.competitors) {
    const name = competitor.trim();
    if (name && hasToken(haystack, name)) return name;
  }
  return null;
}

export function mergeCitations(engine: EngineOutput, extra: string[] = []) {
  return unique([...engine.citations, ...extra].filter(Boolean));
}
