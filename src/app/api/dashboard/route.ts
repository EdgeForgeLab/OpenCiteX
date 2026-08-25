import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { visibilityHistoryForBrand } from "@/lib/jobs";
import { computeMetrics, toResultRow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") ?? searchParams.get("projectId");
    if (!brandId) return jsonError("brandId is required.");

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { prompts: true },
    });
    if (!brand) return jsonError("Brand not found.", 404);

    const results = await prisma.result.findMany({
      where: { prompt: { brandId } },
      orderBy: { createdAt: "desc" },
      include: {
        prompt: { include: { brand: true } },
      },
    });

    const latestByKey = new Map<string, (typeof results)[number]>();
    for (const result of results) {
      const key = `${result.promptId}:${result.engine}`;
      if (!latestByKey.has(key)) latestByKey.set(key, result);
    }

    const rows = Array.from(latestByKey.values()).map(toResultRow);
    const metrics = computeMetrics(rows);
    const history = await visibilityHistoryForBrand(brandId);

    return NextResponse.json({
      brand,
      metrics,
      history,
      promptCount: brand.prompts.length,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load dashboard.",
      500,
    );
  }
}