import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDefaultPrompts } from "@/lib/prompts";
import { jsonError, errorMessage } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const projectSchema = z.object({
  name: z.string().min(1, "Brand name is required."),
  targetDomain: z.string().min(1, "Target domain is required."),
  brandKeywords: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  seedPrompts: z.boolean().optional().default(true),
});

export async function GET() {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { prompts: true } } },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load projects.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = projectSchema.parse(await request.json());
    const project = await prisma.project.create({
      data: {
        name: payload.name.trim(),
        targetDomain: payload.targetDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        brandKeywords: payload.brandKeywords.map((item) => item.trim()).filter(Boolean),
        competitors: payload.competitors.map((item) => item.trim()).filter(Boolean),
      },
    });

    if (payload.seedPrompts) {
      const prompts = buildDefaultPrompts({
        brandName: project.name,
        targetDomain: project.targetDomain,
        competitors: project.competitors,
      });
      await prisma.prompt.createMany({
        data: prompts.map((prompt) => ({
          projectId: project.id,
          text: prompt.text,
          category: prompt.category,
        })),
      });
    }

    const created = await prisma.project.findUnique({
      where: { id: project.id },
      include: { prompts: true },
    });

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to create project."), 400);
  }
}
