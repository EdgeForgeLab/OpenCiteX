import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, errorMessage, languageSchema } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { syncBrandPrompts } from "@/lib/sync-prompts";

export const dynamic = "force-dynamic";

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required."),
  targetDomain: z.string().min(1, "Target domain is required."),
  aliases: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  industryCategory: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  language: languageSchema.default("en"),
});

const promptSelect = { id: true, text: true, category: true } as const;

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function GET() {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        prompts: { select: promptSelect, orderBy: [{ category: "asc" }, { text: "asc" }] },
        _count: { select: { prompts: true } },
      },
    });
    return NextResponse.json({ brands });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load brands.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = brandSchema.parse(await request.json());
    const brand = await prisma.brand.create({
      data: {
        name: payload.name.trim(),
        targetDomain: payload.targetDomain.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""),
        aliases: payload.aliases.map((item) => item.trim()).filter(Boolean),
        competitors: payload.competitors.map((item) => item.trim()).filter(Boolean),
        industryCategory: optionalText(payload.industryCategory),
        description: optionalText(payload.description),
        language: payload.language,
      },
    });

    const sync = await syncBrandPrompts(brand);
    const created = await prisma.brand.findUnique({
      where: { id: brand.id },
      include: {
        prompts: { select: promptSelect, orderBy: [{ category: "asc" }, { text: "asc" }] },
      },
    });

    return NextResponse.json({ brand: created, promptsReplaced: sync.replaced }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to create brand."), 400);
  }
}
