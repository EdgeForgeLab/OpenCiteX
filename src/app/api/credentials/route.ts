import { z } from "zod";
import { errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import {
  configuredFromHints,
  readWorkspaceHints,
  upsertWorkspaceKeys,
  type KeyPatch,
} from "@/lib/credentials";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    perplexity: z.string().nullable().optional(),
    openai: z.string().nullable().optional(),
    gemini: z.string().nullable().optional(),
  })
  .refine(
    (value) =>
      value.perplexity !== undefined || value.openai !== undefined || value.gemini !== undefined,
    { message: "Provide at least one key field." },
  );

export async function GET() {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const hints = await readWorkspaceHints();
    return NextResponse.json({
      hints,
      configured: configuredFromHints(hints),
    });
  } catch (error) {
    return jsonError(errorMessage(error, "Could not load credentials."), 500);
  }
}

export async function PUT(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = patchSchema.parse(await request.json());
    const hints = await upsertWorkspaceKeys(payload as KeyPatch);
    return NextResponse.json({
      hints,
      configured: configuredFromHints(hints),
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    return jsonError(errorMessage(error, "Could not save credentials."), status);
  }
}
