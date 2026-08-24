import type { Engine } from "@prisma/client";
import { findInterceptor } from "@/lib/citations";

export type ResultRow = {
  id: string;
  promptId: string;
  promptText: string;
  category: string;
  engine: Engine;
  isMentioned: boolean;
  hasCitation: boolean;
  rankPosition: number;
  rawText: string;
  citations: string[];
  createdAt: string;
  interceptedBy: string | null;
  status: "cited" | "mentioned" | "hidden";
};

export type DashboardMetrics = {
  visibilityScore: number;
  citationRate: number;
  topInterceptor: string | null;
  totalRuns: number;
  mentionedCount: number;
  citedCount: number;
};

export function visibilityStatus(isMentioned: boolean, hasCitation: boolean) {
  if (isMentioned && hasCitation) return "cited" as const;
  if (isMentioned) return "mentioned" as const;
  return "hidden" as const;
}

export function computeMetrics(
  rows: ResultRow[],
): DashboardMetrics {
  const totalRuns = rows.length;
  const mentionedCount = rows.filter((row) => row.isMentioned).length;
  const citedCount = rows.filter((row) => row.hasCitation).length;
  const interceptCounts = new Map<string, number>();

  for (const row of rows) {
    if ((row.isMentioned && row.hasCitation) || !row.interceptedBy) continue;
    interceptCounts.set(
      row.interceptedBy,
      (interceptCounts.get(row.interceptedBy) ?? 0) + 1,
    );
  }

  const topInterceptor =
    Array.from(interceptCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    visibilityScore: totalRuns ? mentionedCount / totalRuns : 0,
    citationRate: totalRuns ? citedCount / totalRuns : 0,
    topInterceptor,
    totalRuns,
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
    prompt: { text: string; category: string; project: { name: string; competitors: string[] } };
  },
): ResultRow {
  return {
    id: result.id,
    promptId: result.promptId,
    promptText: result.prompt.text,
    category: result.prompt.category,
    engine: result.engine,
    isMentioned: result.isMentioned,
    hasCitation: result.hasCitation,
    rankPosition: result.rankPosition,
    rawText: result.rawText,
    citations: result.citations,
    createdAt: result.createdAt.toISOString(),
    interceptedBy: findInterceptor({
      rawText: result.rawText,
      citations: result.citations,
      competitors: result.prompt.project.competitors,
      brandName: result.prompt.project.name,
      isMentioned: result.isMentioned,
    }),
    status: visibilityStatus(result.isMentioned, result.hasCitation),
  };
}
