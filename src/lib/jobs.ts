import type { Engine, Job, JobStatus, Prisma } from "@prisma/client";
import {
  buildJobMetrics,
  computeMetrics,
  toResultRow,
  type CompetitorMetrics,
  type EngineVisibilityPoint,
  type JobMetrics,
  type VisibilityHistoryPoint,
} from "@/lib/metrics";
import { prisma } from "@/lib/prisma";

export type JobRecord = {
  id: string;
  brandId: string;
  brandName: string;
  engines: Engine[];
  status: JobStatus;
  total: number;
  completed: number;
  errors: number;
  currentPrompt: string | null;
  currentEngine: Engine | null;
  metrics: JobMetrics | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

function asCompetitor(value: unknown): CompetitorMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== "string" || typeof raw.visibilityScore !== "number") return null;
  return raw as CompetitorMetrics;
}

function asMetrics(value: Prisma.JsonValue | null | undefined): JobMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.visibilityScore !== "number") return null;
  const competitors = Array.isArray(raw.competitors)
    ? raw.competitors.map(asCompetitor).filter((item): item is CompetitorMetrics => Boolean(item))
    : [];
  return { ...(raw as unknown as JobMetrics), competitors };
}

export function serializeJob(
  job: Job & { brand: { id: string; name: string } },
): JobRecord {
  return {
    id: job.id,
    brandId: job.brandId,
    brandName: job.brand.name,
    engines: job.engines,
    status: job.status,
    total: job.total,
    completed: job.completed,
    errors: job.errors,
    currentPrompt: job.currentPrompt,
    currentEngine: job.currentEngine,
    metrics: asMetrics(job.metrics),
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export async function computeJobMetrics(jobId: string): Promise<JobMetrics> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      brand: true,
      results: {
        orderBy: { createdAt: "desc" },
        include: { prompt: { include: { brand: true } } },
      },
    },
  });
  if (!job) {
    return buildJobMetrics([], "", []);
  }

  const latestByKey = new Map<string, (typeof job.results)[number]>();
  for (const result of job.results) {
    const key = `${result.promptId}:${result.engine}`;
    if (!latestByKey.has(key)) latestByKey.set(key, result);
  }

  return buildJobMetrics(
    Array.from(latestByKey.values()).map(toResultRow),
    job.brand.name,
    job.brand.competitors,
  );
}

export async function persistJobMetrics(jobId: string): Promise<JobMetrics> {
  const metrics = await computeJobMetrics(jobId);
  await prisma.job.update({
    where: { id: jobId },
    data: { metrics: metrics as Prisma.InputJsonValue },
  });
  return metrics;
}

export async function persistMetricsForJobs(ids: string[]) {
  for (const id of ids) {
    await persistJobMetrics(id);
  }
}

export async function visibilityHistoryForBrand(brandId: string): Promise<{
  competitorNames: string[];
  points: VisibilityHistoryPoint[];
  engines: Engine[];
  enginePoints: EngineVisibilityPoint[];
}> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { competitors: true },
  });
  const jobs = await prisma.job.findMany({
    where: {
      brandId,
      status: { in: ["completed", "cancelled"] },
      completed: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, metrics: true, finishedAt: true, createdAt: true },
  });

  const chronological = [...jobs].reverse();

  const results = jobs.length
    ? await prisma.result.findMany({
        where: { jobId: { in: jobs.map((job) => job.id) } },
        orderBy: { createdAt: "desc" },
        include: { prompt: { include: { brand: true } } },
      })
    : [];

  const resultsByJob = new Map<string, typeof results>();
  for (const result of results) {
    if (!result.jobId) continue;
    const list = resultsByJob.get(result.jobId) ?? [];
    list.push(result);
    resultsByJob.set(result.jobId, list);
  }

  const points: VisibilityHistoryPoint[] = [];
  const enginePoints: EngineVisibilityPoint[] = [];
  const engineIds = new Set<Engine>();
  let computed = 0;

  for (const job of chronological) {
    let metrics = asMetrics(job.metrics);
    if (!metrics && computed < 12) {
      metrics = await computeJobMetrics(job.id);
      computed += 1;
    }
    if (!metrics) continue;

    const at = (job.finishedAt ?? job.createdAt).toISOString();
    points.push({
      at,
      jobId: job.id,
      you: metrics.visibilityScore,
      competitors: metrics.competitors.map((item) => ({
        name: item.name,
        value: item.visibilityScore,
      })),
    });

    const jobResults = resultsByJob.get(job.id) ?? [];
    const latestByKey = new Map<string, (typeof jobResults)[number]>();
    for (const result of jobResults) {
      const key = `${result.promptId}:${result.engine}`;
      if (!latestByKey.has(key)) latestByKey.set(key, result);
    }
    const rows = Array.from(latestByKey.values()).map(toResultRow);
    const byEngine = new Map<Engine, typeof rows>();
    for (const row of rows) {
      const list = byEngine.get(row.engine) ?? [];
      list.push(row);
      byEngine.set(row.engine, list);
    }
    const engines = Array.from(byEngine.entries()).map(([engine, engineRows]) => {
      engineIds.add(engine);
      return { engine, value: computeMetrics(engineRows).visibilityScore };
    });
    enginePoints.push({ at, jobId: job.id, engines });
  }

  const names = new Set(brand?.competitors.map((item) => item.trim()).filter(Boolean) ?? []);
  for (const point of points) {
    for (const item of point.competitors) names.add(item.name);
  }

  return {
    competitorNames: Array.from(names),
    points,
    engines: Array.from(engineIds),
    enginePoints,
  };
}

const jobInclude = { brand: { select: { id: true, name: true } } } as const;

export { jobInclude, asMetrics };
