import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, languageSchema } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  targetDomain: z.string().min(1).optional(),
  aliases: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  industryCategory: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  language: languageSchema.optional(),
});

const promptSelect = { id: true, text: true, category: true } as const;

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        prompts: { select: promptSelect, orderBy: [{ category: "asc" }, { text: "asc" }] },
      },
    });
    if (!brand) return jsonError("Brand not found.", 404);
    return NextResponse.json({ brand });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load brand.",
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
    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.targetDomain
          ? {
              targetDomain: payload.targetDomain
                .trim()
                .replace(/^https?:\/\//i, "")
                .replace(/\/$/, ""),
            }
          : {}),
        ...(payload.aliases
          ? { aliases: payload.aliases.map((item) => item.trim()).filter(Boolean) }
          : {}),
        ...(payload.competitors
          ? { competitors: payload.competitors.map((item) => item.trim()).filter(Boolean) }
          : {}),
        ...(payload.industryCategory !== undefined
          ? { industryCategory: optionalText(payload.industryCategory) }
          : {}),
        ...(payload.description !== undefined
          ? { description: optionalText(payload.description) }
          : {}),
        ...(payload.language
          ? { language: payload.language }
          : {}),
      },
      include: {
        prompts: { select: promptSelect, orderBy: [{ category: "asc" }, { text: "asc" }] },
      },
    });
    return NextResponse.json({ brand });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update brand.",
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
    await prisma.brand.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete brand.",
      400,
    );
  }
}
