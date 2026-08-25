import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  category: z.enum(["brand", "category", "competitor", "scenario"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = updateSchema.parse(await request.json());
    const prompt = await prisma.prompt.update({
      where: { id: params.id },
      data: {
        ...(payload.text ? { text: payload.text.trim() } : {}),
        ...(payload.category ? { category: payload.category } : {}),
      },
      include: { brand: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ prompt });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to update prompt."), 400);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    await prisma.prompt.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(errorMessage(error, "Failed to delete prompt."), 400);
  }
}
