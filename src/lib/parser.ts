import {
  citationHosts,
  citationRank,
  hasTargetCitation,
  textMentionsBrand,
} from "@/lib/citations";
import { formatProviderError } from "@/lib/engines/perplexity";
import type { ParsedVisibility } from "@/lib/types";

const PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_mentioned: { type: "boolean" },
    has_citation: { type: "boolean" },
    rank_position: { type: "integer" },
    cited_domains: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["is_mentioned", "has_citation", "rank_position", "cited_domains"],
} as const;

function heuristicParse(input: {
  text: string;
  citations: string[];
  brandName: string;
  brandKeywords: string[];
  targetDomain: string;
}): ParsedVisibility {
  const cited_domains = citationHosts(input.citations);
  const has_citation = hasTargetCitation(input.citations, input.targetDomain);
  return {
    is_mentioned: textMentionsBrand(
      input.text,
      input.brandName,
      input.brandKeywords,
      input.targetDomain,
    ),
    has_citation,
    rank_position: citationRank(input.citations, input.targetDomain),
    cited_domains,
  };
}

export async function parseVisibility(input: {
  openaiKey?: string;
  text: string;
  citations: string[];
  brandName: string;
  brandKeywords: string[];
  targetDomain: string;
  competitors: string[];
}): Promise<ParsedVisibility> {
  const fallback = heuristicParse(input);
  const cited_domains = citationHosts(input.citations);
  const deterministic = {
    has_citation: hasTargetCitation(input.citations, input.targetDomain),
    rank_position: citationRank(input.citations, input.targetDomain),
    cited_domains,
  };

  if (!input.openaiKey) {
    return { ...fallback, ...deterministic };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a GEO (Generative Engine Optimization) analyst. Score whether a brand is visible in an AI engine answer. Be conservative: only mark is_mentioned true when the brand name, a brand keyword, or the target domain clearly appears.",
          },
          {
            role: "user",
            content: JSON.stringify({
              brand_name: input.brandName,
              target_domain: input.targetDomain,
              brand_keywords: input.brandKeywords,
              competitors: input.competitors,
              engine_answer: input.text.slice(0, 12_000),
              citation_urls: input.citations.slice(0, 40),
              instructions: {
                is_mentioned:
                  "true if brand name, a keyword, or target domain appears in the answer text",
                has_citation:
                  "true if any citation host equals or is a subdomain of the target domain",
                rank_position:
                  "1-based index of the first matching citation host among unique cited_domains; 0 if none",
                cited_domains:
                  "unique lowercase hosts from citation URLs, strip leading www",
              },
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "geo_visibility",
            strict: true,
            schema: PARSE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(formatProviderError("OpenAI parser", response.status, body));
    }

    const data = JSON.parse(body) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty parser response.");

    const parsed = JSON.parse(content) as ParsedVisibility;
    return {
      is_mentioned: Boolean(parsed.is_mentioned) || fallback.is_mentioned,
      has_citation: deterministic.has_citation,
      rank_position: deterministic.rank_position,
      cited_domains:
        deterministic.cited_domains.length > 0
          ? deterministic.cited_domains
          : Array.isArray(parsed.cited_domains)
            ? parsed.cited_domains
            : [],
    };
  } catch {
    return { ...fallback, ...deterministic };
  }
}
