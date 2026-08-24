import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { computeMetrics, toResultRow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return jsonError("projectId is required.");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { prompts: true },
    });
    if (!project) return jsonError("Project not found.", 404);

    const results = await prisma.result.findMany({
      where: { prompt: { projectId } },
      orderBy: { createdAt: "desc" },
      include: {
        prompt: { include: { project: true } },
      },
    });

    const latestByKey = new Map<string, (typeof results)[number]>();
    for (const result of results) {
      const key = `${result.promptId}:${result.engine}`;
      if (!latestByKey.has(key)) latestByKey.set(key, result);
    }

    const rows = Array.from(latestByKey.values()).map(toResultRow);
    const metrics = computeMetrics(rows);

    return NextResponse.json({
      project,
      rows,
      metrics,
      promptCount: project.prompts.length,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load dashboard.",
      500,
    );
  }
}
