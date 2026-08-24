import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  targetDomain: z.string().min(1).optional(),
  brandKeywords: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { prompts: { orderBy: { category: "asc" } } },
    });
    if (!project) return jsonError("Project not found.", 404);
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load project.",
      500,
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = updateSchema.parse(await request.json());
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.targetDomain
          ? {
              targetDomain: payload.targetDomain
                .trim()
                .replace(/^https?:\/\//, "")
                .replace(/\/$/, ""),
            }
          : {}),
        ...(payload.brandKeywords
          ? { brandKeywords: payload.brandKeywords.map((item) => item.trim()).filter(Boolean) }
          : {}),
        ...(payload.competitors
          ? { competitors: payload.competitors.map((item) => item.trim()).filter(Boolean) }
          : {}),
      },
    });
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update project.",
      400,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete project.",
      400,
    );
  }
}
