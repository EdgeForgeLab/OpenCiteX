import { z } from "zod";
import { errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import {
  configuredFromHints,
  readWorkspaceAnalyzer,
  readWorkspaceHints,
  readWorkspacePace,
  upsertWorkspaceAnalyzer,
  upsertWorkspaceKeys,
  upsertWorkspacePace,
  type KeyPatch,
} from "@/lib/credentials";
import { MAX_PACE_SEC, MIN_PACE_SEC, PROVIDER_IDS, type ProviderId } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const keyPatchSchema = z
  .object({
    perplexity: z.string().nullable().optional(),
    openai: z.string().nullable().optional(),
    gemini: z.string().nullable().optional(),
    deepseek: z.string().nullable().optional(),
    qwen: z.string().nullable().optional(),
  })
  .refine(
    (value) => PROVIDER_IDS.some((id) => value[id] !== undefined),
    { message: "Provide at least one key field." },
  );

const paceValue = z.number().min(MIN_PACE_SEC * 1000).max(MAX_PACE_SEC * 1000);
const pacePatchSchema = z.object({
  paceMs: z
    .object({
      perplexity: paceValue.optional(),
      openai: paceValue.optional(),
      gemini: paceValue.optional(),
      deepseek: paceValue.optional(),
      qwen: paceValue.optional(),
    })
    .refine((value) => PROVIDER_IDS.some((id) => value[id] !== undefined), {
      message: "Provide at least one interval.",
    }),
});

const analyzerPatchSchema = z.object({
  analyzer: z.enum(PROVIDER_IDS).nullable(),
});

async function payloadJson(partial?: {
  hints?: Awaited<ReturnType<typeof readWorkspaceHints>>;
  paceMs?: Awaited<ReturnType<typeof readWorkspacePace>>;
  analyzer?: ProviderId | null;
}) {
  const hints = partial?.hints ?? (await readWorkspaceHints());
  const paceMs = partial?.paceMs ?? (await readWorkspacePace());
  const analyzer =
    partial?.analyzer !== undefined ? partial.analyzer : await readWorkspaceAnalyzer();
  return {
    hints,
    configured: configuredFromHints(hints),
    paceMs,
    analyzer,
  };
}

export async function GET() {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    return NextResponse.json(await payloadJson());
  } catch (error) {
    return jsonError(errorMessage(error, "Could not load credentials."), 500);
  }
}

export async function PUT(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && "paceMs" in raw) {
      const payload = pacePatchSchema.parse(raw);
      const paceMs = await upsertWorkspacePace(payload.paceMs);
      return NextResponse.json(await payloadJson({ paceMs }));
    }

    if (raw && typeof raw === "object" && "analyzer" in raw) {
      const payload = analyzerPatchSchema.parse(raw);
      const analyzer = await upsertWorkspaceAnalyzer(payload.analyzer);
      return NextResponse.json(await payloadJson({ analyzer }));
    }

    const payload = keyPatchSchema.parse(raw);
    const hints = await upsertWorkspaceKeys(payload as KeyPatch);
    return NextResponse.json(await payloadJson({ hints }));
  } catch (error) {
    const message = errorMessage(error, "Could not save credentials.");
    const status = error instanceof z.ZodError ? 400 : message.includes("API key") ? 400 : 500;
    return jsonError(message, status);
  }
}