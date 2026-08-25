import { NextResponse } from "next/server";
import { z } from "zod";
import { engineSchema, errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { jobInclude, persistJobMetrics, serializeJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["queued", "running", "completed", "cancelled", "failed"]).optional(),
  completed: z.number().int().min(0).optional(),
  errors: z.number().int().min(0).optional(),
  currentPrompt: z.string().nullable().optional(),
  currentEngine: engineSchema.nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: jobInclude,
    });
    if (!job) return jsonError("Job not found.", 404);
    return NextResponse.json({ job: serializeJob(job) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load job.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = patchSchema.parse(await request.json());
    const existing = await prisma.job.findUnique({ where: { id: params.id } });
    if (!existing) return jsonError("Job not found.", 404);

    const terminal = payload.status && ["completed", "cancelled", "failed"].includes(payload.status);
    const job = await prisma.job.update({
      where: { id: params.id },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.completed !== undefined ? { completed: payload.completed } : {}),
        ...(payload.errors !== undefined ? { errors: payload.errors } : {}),
        ...(payload.currentPrompt !== undefined ? { currentPrompt: payload.currentPrompt } : {}),
        ...(payload.currentEngine !== undefined ? { currentEngine: payload.currentEngine } : {}),
        ...(terminal ? { finishedAt: existing.finishedAt ?? new Date() } : {}),
      },
      include: jobInclude,
    });

    if (terminal) {
      const metrics = await persistJobMetrics(job.id);
      return NextResponse.json({ job: { ...serializeJob(job), metrics } });
    }

    return NextResponse.json({ job: serializeJob(job) });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to update job."), 400);
  }
}
