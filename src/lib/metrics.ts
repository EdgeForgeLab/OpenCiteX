import type { Engine } from "@prisma/client";
import {
  citationRank,
  findInterceptor,
  hasTargetCitation,
  promptCuesBrand,
  textMentionsBrand,
} from "@/lib/citations";

export type VisibilityStatus = "cited" | "mentioned" | "prompted" | "hidden";

export type ResultRow = {
  id: string;
  promptId: string;
  promptText: string;
  category: string;
  engine: Engine;
  isMentioned: boolean;
  hasCitation: boolean;
  brandCued: boolean;
  rankPosition: number;
  rawText: string;
  citations: string[];
  createdAt: string;
  interceptedBy: string | null;
  status: VisibilityStatus;
};

export type DashboardMetrics = {
  visibilityScore: number;
  citationRate: number;
  topInterceptor: string | null;
  totalRuns: number;
  unpromptedRuns: number;
  mentionedCount: number;
  citedCount: number;
};

export function visibilityStatus(input: {
  isMentioned: boolean;
  hasCitation: boolean;
  brandCued: boolean;
}): VisibilityStatus {
  if (input.hasCitation) return "cited";
  if (input.brandCued) return input.isMentioned ? "prompted" : "hidden";
  if (input.isMentioned) return "mentioned";
  return "hidden";
}

export function computeMetrics(rows: ResultRow[]): DashboardMetrics {
  const unprompted = rows.filter((row) => !row.brandCued);
  const mentionedCount = unprompted.filter((row) => row.isMentioned).length;
  const citedCount = unprompted.filter((row) => row.hasCitation).length;
  const interceptCounts = new Map<string, number>();

  for (const row of unprompted) {
    if (row.isMentioned || !row.interceptedBy) continue;
    interceptCounts.set(
      row.interceptedBy,
      (interceptCounts.get(row.interceptedBy) ?? 0) + 1,
    );
  }

  const topInterceptor =
    Array.from(interceptCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const unpromptedRuns = unprompted.length;

  return {
    visibilityScore: unpromptedRuns ? mentionedCount / unpromptedRuns : 0,
    citationRate: unpromptedRuns ? citedCount / unpromptedRuns : 0,
    topInterceptor,
    totalRuns: rows.length,
    unpromptedRuns,
    mentionedCount,
    citedCount,
  };
}

export function toResultRow(
  result: {
    id: string;
    promptId: string;
    engine: Engine;
    isMentioned: boolean;
    hasCitation: boolean;
    rankPosition: number;
    rawText: string;
    citations: string[];
    createdAt: Date;
    prompt: {
      text: string;
      category: string;
      project: {
        name: string;
        targetDomain: string;
        brandKeywords: string[];
        competitors: string[];
      };
    };
  },
): ResultRow {
  const brandCued = promptCuesBrand(
    result.prompt.text,
    result.prompt.project.name,
    result.prompt.project.brandKeywords,
    result.prompt.project.targetDomain,
  );
  const isMentioned = textMentionsBrand(
    result.rawText,
    result.prompt.project.name,
    result.prompt.project.brandKeywords,
    result.prompt.project.targetDomain,
  );
  const hasCitation = hasTargetCitation(
    result.citations,
    result.prompt.project.targetDomain,
  );
  const rankPosition = citationRank(result.citations, result.prompt.project.targetDomain);

  return {
    id: result.id,
    promptId: result.promptId,
    promptText: result.prompt.text,
    category: result.prompt.category,
    engine: result.engine,
    isMentioned,
    hasCitation,
    brandCued,
    rankPosition,
    rawText: result.rawText,
    citations: result.citations,
    createdAt: result.createdAt.toISOString(),
    interceptedBy: findInterceptor({
      rawText: result.rawText,
      citations: result.citations,
      competitors: result.prompt.project.competitors,
      isMentioned,
    }),
    status: visibilityStatus({ isMentioned, hasCitation, brandCued }),
  };
}
