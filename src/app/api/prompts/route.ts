import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, errorMessage } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  projectId: z.string().min(1),
  text: z.string().min(8, "Prompt text is too short."),
  category: z.enum(["brand", "category", "competitor", "scenario"]),
});

export async function GET(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return jsonError("projectId is required.");

    const prompts = await prisma.prompt.findMany({
      where: { projectId },
      orderBy: [{ category: "asc" }, { text: "asc" }],
      include: { _count: { select: { results: true } } },
    });
    return NextResponse.json({ prompts });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load prompts.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = createSchema.parse(await request.json());
    const prompt = await prisma.prompt.create({
      data: {
        projectId: payload.projectId,
        text: payload.text.trim(),
        category: payload.category,
      },
    });
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to create prompt."), 400);
  }
}
