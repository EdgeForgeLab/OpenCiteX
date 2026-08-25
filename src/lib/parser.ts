import {
  citationHosts,
  citationRank,
  hasTargetCitation,
  textMentionsBrand,
} from "@/lib/citations";
import { classifyBrandMention } from "@/lib/engines/analyzer";
import type { ParsedVisibility, ProviderId } from "@/lib/types";

export async function parseVisibility(input: {
  text: string;
  citations: string[];
  brandName: string;
  aliases: string[];
  targetDomain: string;
  competitors?: string[];
  analyzerId?: ProviderId | null;
  analyzerKey?: string | null;
}): Promise<ParsedVisibility> {
  const cited_domains = citationHosts(input.citations);
  const parsed: ParsedVisibility = {
    is_mentioned: textMentionsBrand(
      input.text,
      input.brandName,
      input.aliases,
      input.targetDomain,
    ),
    has_citation: hasTargetCitation(input.citations, input.targetDomain),
    rank_position: citationRank(input.citations, input.targetDomain),
    cited_domains,
  };

  if (parsed.is_mentioned) return parsed;
  if (!input.analyzerId || !input.analyzerKey) return parsed;

  const mentioned = await classifyBrandMention({
    engine: input.analyzerId,
    apiKey: input.analyzerKey,
    brandName: input.brandName,
    aliases: input.aliases,
    targetDomain: input.targetDomain,
    competitors: input.competitors ?? [],
    text: input.text,
  });

  if (mentioned) parsed.is_mentioned = true;
  return parsed;
}