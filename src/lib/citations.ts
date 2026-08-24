import { domainMatches, hostnameFromUrl, unique } from "@/lib/utils";
import type { EngineOutput } from "@/lib/types";

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

export function findInterceptor(input: {
  rawText: string;
  citations: string[];
  competitors: string[];
  brandName: string;
  isMentioned: boolean;
}) {
  if (input.isMentioned) return null;
  const haystack = `${input.rawText} ${input.citations.join(" ")}`.toLowerCase();
  for (const competitor of input.competitors) {
    const name = competitor.trim();
    if (name && haystack.includes(name.toLowerCase())) return name;
  }
  return null;
}

export function textMentionsBrand(text: string, brandName: string, keywords: string[], domain: string) {
  const haystack = text.toLowerCase();
  const needles = unique(
    [brandName, domain, ...keywords]
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length >= 2),
  );
  return needles.some((needle) => haystack.includes(needle));
}

export function mergeCitations(engine: EngineOutput, extra: string[] = []) {
  return unique([...engine.citations, ...extra].filter(Boolean));
}
