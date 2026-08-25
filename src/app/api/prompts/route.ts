import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const categorySchema = z.enum(["brand", "category", "competitor", "scenario"]);

const createSchema = z.object({
  brandId: z.string().min(1),
  text: z.string().min(1),
  category: categorySchema,
});

export async function GET(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") ?? searchParams.get("projectId");

    const prompts = await prisma.prompt.findMany({
      where: brandId ? { brandId } : undefined,
      include: { brand: { select: { id: true, name: true } } },
      orderBy: brandId
        ? [{ category: "asc" }, { text: "asc" }]
        : [{ brand: { name: "asc" } }, { category: "asc" }, { text: "asc" }],
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
    const brand = await prisma.brand.findUnique({ where: { id: payload.brandId }, select: { id: true } });
    if (!brand) return jsonError("Brand not found.", 404);

    const prompt = await prisma.prompt.create({
      data: {
        brandId: payload.brandId,
        text: payload.text.trim(),
        category: payload.category,
      },
      include: { brand: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to create prompt."), 400);
  }
}
