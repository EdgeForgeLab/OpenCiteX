import type { Engine } from "@prisma/client";
import {
  citationRank,
  citationRankByName,
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
  jobId: string | null;
  brandId: string;
  brandName: string;
  targetDomain: string;
};

export type DashboardMetrics = {
  visibilityScore: number;
  citationRate: number;
  interceptionRate: number;
  averageRank: number | null;
  topInterceptor: string | null;
  totalRuns: number;
  unpromptedRuns: number;
  marketRuns: number;
  mentionedCount: number;
  citedCount: number;
  interceptCount: number;
  rankedCount: number;
};

export type CompetitorMetrics = DashboardMetrics & { name: string };

export type JobMetrics = DashboardMetrics & {
  competitors: CompetitorMetrics[];
};

export type VisibilityHistoryPoint = {
  at: string;
  jobId: string;
  you: number;
  competitors: { name: string; value: number }[];
};

export type EngineVisibilityPoint = {
  at: string;
  jobId: string;
  engines: { engine: Engine; value: number }[];
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

function isMarketProbe(row: ResultRow) {
  return !row.brandCued && (row.category === "category" || row.category === "scenario");
}

export function computeMetrics(rows: ResultRow[]): DashboardMetrics {
  const unprompted = rows.filter((row) => !row.brandCued);
  const market = rows.filter(isMarketProbe);
  const mentionedCount = unprompted.filter((row) => row.isMentioned).length;
  const citedCount = unprompted.filter((row) => row.hasCitation).length;
  const interceptCount = market.filter((row) => !row.isMentioned && row.interceptedBy).length;
  const ranks = unprompted
    .filter((row) => row.hasCitation && row.rankPosition > 0)
    .map((row) => row.rankPosition);
  const interceptCounts = new Map<string, number>();

  for (const row of market) {
    if (row.isMentioned || !row.interceptedBy) continue;
    interceptCounts.set(
      row.interceptedBy,
      (interceptCounts.get(row.interceptedBy) ?? 0) + 1,
    );
  }

  const topInterceptor =
    Array.from(interceptCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const unpromptedRuns = unprompted.length;
  const marketRuns = market.length;

  return {
    visibilityScore: unpromptedRuns ? mentionedCount / unpromptedRuns : 0,
    citationRate: unpromptedRuns ? citedCount / unpromptedRuns : 0,
    interceptionRate: marketRuns ? interceptCount / marketRuns : 0,
    averageRank: ranks.length
      ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
      : null,
    topInterceptor,
    totalRuns: rows.length,
    unpromptedRuns,
    marketRuns,
    mentionedCount,
    citedCount,
    interceptCount,
    rankedCount: ranks.length,
  };
}

export function computeCompetitorMetrics(
  rows: ResultRow[],
  competitor: string,
  brandName: string,
  competitors: string[],
): DashboardMetrics {
  const name = competitor.trim();
  const others = [brandName, ...competitors]
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== name.toLowerCase());

  const mapped = rows.map((row) => {
    const isMentioned = textMentionsBrand(row.rawText, name, [], "");
    const rankPosition = citationRankByName(row.citations, name);
    const hasCitation = rankPosition > 0;
    return {
      ...row,
      isMentioned,
      hasCitation,
      rankPosition,
      interceptedBy: findInterceptor({
        rawText: row.rawText,
        citations: row.citations,
        competitors: others,
        isMentioned,
      }),
      status: visibilityStatus({ isMentioned, hasCitation, brandCued: row.brandCued }),
    };
  });

  return computeMetrics(mapped);
}

export function buildJobMetrics(
  rows: ResultRow[],
  brandName: string,
  competitors: string[],
): JobMetrics {
  const names = competitors.map((item) => item.trim()).filter(Boolean);
  return {
    ...computeMetrics(rows),
    competitors: names.map((name) => ({
      name,
      ...computeCompetitorMetrics(rows, name, brandName, names),
    })),
  };
}

export function toResultRow(
  result: {
    id: string;
    promptId: string;
    jobId?: string | null;
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
      brand: {
        id: string;
        name: string;
        targetDomain: string;
        aliases: string[];
        competitors: string[];
      };
    };
  },
): ResultRow {
  const brandCued = promptCuesBrand(
    result.prompt.text,
    result.prompt.brand.name,
    result.prompt.brand.aliases,
    result.prompt.brand.targetDomain,
  );
  const isMentioned = result.isMentioned;
  const hasCitation = hasTargetCitation(
    result.citations,
    result.prompt.brand.targetDomain,
  );
  const rankPosition = citationRank(result.citations, result.prompt.brand.targetDomain);

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
      competitors: result.prompt.brand.competitors,
      isMentioned,
    }),
    status: visibilityStatus({ isMentioned, hasCitation, brandCued }),
    jobId: result.jobId ?? null,
    brandId: result.prompt.brand.id,
    brandName: result.prompt.brand.name,
    targetDomain: result.prompt.brand.targetDomain,
  };
}
