import {
  citationHosts,
  citationRank,
  hasTargetCitation,
  textMentionsBrand,
} from "@/lib/citations";
import type { ParsedVisibility } from "@/lib/types";

export async function parseVisibility(input: {
  text: string;
  citations: string[];
  brandName: string;
  brandKeywords: string[];
  targetDomain: string;
}): Promise<ParsedVisibility> {
  const cited_domains = citationHosts(input.citations);
  return {
    is_mentioned: textMentionsBrand(
      input.text,
      input.brandName,
      input.brandKeywords,
      input.targetDomain,
    ),
    has_citation: hasTargetCitation(input.citations, input.targetDomain),
    rank_position: citationRank(input.citations, input.targetDomain),
    cited_domains,
  };
}
