import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { engineSchema, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { toResultRow, type VisibilityStatus } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES: VisibilityStatus[] = ["cited", "mentioned", "prompted", "hidden"];

export async function GET(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || undefined;
    const jobId = searchParams.get("jobId") || undefined;
    const engineRaw = searchParams.get("engine") || undefined;
    const statusRaw = searchParams.get("status") || undefined;
    const engineParsed = engineRaw ? engineSchema.safeParse(engineRaw) : null;
    const engine = engineParsed?.success ? engineParsed.data : undefined;
    const status = STATUSES.includes(statusRaw as VisibilityStatus)
      ? (statusRaw as VisibilityStatus)
      : undefined;

    const where: Prisma.ResultWhereInput = {
      ...(brandId ? { prompt: { brandId } } : {}),
      ...(jobId ? { jobId } : {}),
      ...(engine ? { engine } : {}),
    };

    const results = await prisma.result.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        prompt: { include: { brand: true } },
      },
    });

    const rows = results.map(toResultRow).filter((row) => (status ? row.status === status : true));
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load logs.", 500);
  }
}
