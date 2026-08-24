import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { buildDefaultPrompts } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const project = await prisma.project.findUnique({ where: { id: params.id } });
    if (!project) return jsonError("Project not found.", 404);

    const existing = await prisma.prompt.findMany({
      where: { projectId: project.id },
      select: { text: true },
    });
    const existingTexts = new Set(existing.map((item) => item.text));

    const prompts = buildDefaultPrompts({
      brandName: project.name,
      targetDomain: project.targetDomain,
      competitors: project.competitors,
    }).filter((prompt) => !existingTexts.has(prompt.text));

    if (prompts.length > 0) {
      await prisma.prompt.createMany({
        data: prompts.map((prompt) => ({
          projectId: project.id,
          text: prompt.text,
          category: prompt.category,
        })),
      });
    }

    const all = await prisma.prompt.findMany({
      where: { projectId: project.id },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ added: prompts.length, prompts: all });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to seed prompts.",
      400,
    );
  }
}
