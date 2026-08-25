import { NextResponse } from "next/server";
import { z } from "zod";
import { engineSchema, errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { jobInclude, persistMetricsForJobs, serializeJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { readWorkspaceKeys } from "@/lib/credentials";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  brandId: z.string().min(1),
  engines: z.array(engineSchema).min(1),
});

export async function GET() {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: jobInclude,
    });
    return NextResponse.json({ jobs: jobs.map(serializeJob) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load jobs.", 500);
  }
}

export async function PUT(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = z.object({ abandonRunning: z.literal(true) }).parse(await request.json());
    void payload;
    const active = await prisma.job.findMany({
      where: { status: { in: ["queued", "running"] } },
      select: { id: true },
    });
    const result = await prisma.job.updateMany({
      where: { status: { in: ["queued", "running"] } },
      data: { status: "cancelled", finishedAt: new Date(), currentPrompt: null, currentEngine: null },
    });
    await persistMetricsForJobs(active.map((job) => job.id));
    return NextResponse.json({ abandoned: result.count });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to abandon jobs."), 400);
  }
}

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = createSchema.parse(await request.json());
    const brand = await prisma.brand.findUnique({
      where: { id: payload.brandId },
      include: { prompts: { orderBy: [{ category: "asc" }, { text: "asc" }] } },
    });
    if (!brand) return jsonError("Brand not found.", 404);
    if (brand.prompts.length === 0) {
      return jsonError("Save the brand so probes can be generated.", 400);
    }

    const keys = await readWorkspaceKeys();
    const missing = payload.engines.filter((engine) => !keys[engine]);
    if (missing.length > 0) {
      return jsonError(`No API key saved for ${missing.join(", ")}.`, 400);
    }

    const displaced = await prisma.job.findMany({
      where: { status: { in: ["queued", "running"] } },
      select: { id: true },
    });
    await prisma.job.updateMany({
      where: { status: { in: ["queued", "running"] } },
      data: { status: "cancelled", finishedAt: new Date(), currentPrompt: null, currentEngine: null },
    });
    await persistMetricsForJobs(displaced.map((job) => job.id));

    const total = brand.prompts.length * payload.engines.length;
    const job = await prisma.job.create({
      data: {
        brandId: brand.id,
        engines: payload.engines,
        status: "running",
        total,
        startedAt: new Date(),
      },
      include: jobInclude,
    });

    return NextResponse.json(
      {
        job: serializeJob(job),
        prompts: brand.prompts.map((prompt) => ({ id: prompt.id, text: prompt.text })),
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to create job."), 400);
  }
}
