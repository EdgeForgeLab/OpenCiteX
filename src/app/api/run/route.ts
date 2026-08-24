import { NextResponse } from "next/server";
import { z } from "zod";
import { engineSchema, errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import { readWorkspaceKeys } from "@/lib/credentials";
import { queryEngine } from "@/lib/engines";
import { parseVisibility } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { toResultRow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const runSchema = z.object({
  promptId: z.string().min(1),
  engine: engineSchema,
});

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = runSchema.parse(await request.json());
    const prompt = await prisma.prompt.findUnique({
      where: { id: payload.promptId },
      include: { project: true },
    });

    if (!prompt) return jsonError("Prompt not found.", 404);

    const keys = await readWorkspaceKeys();
    const engineKey = keys[payload.engine];
    if (!engineKey) {
      return jsonError(`No ${payload.engine} API key saved in Settings.`, 400);
    }

    const output = await queryEngine(payload.engine, keys, prompt.text);
    const parsed = await parseVisibility({
      openaiKey: keys.openai,
      text: output.text,
      citations: output.citations,
      brandName: prompt.project.name,
      brandKeywords: prompt.project.brandKeywords,
      targetDomain: prompt.project.targetDomain,
      competitors: prompt.project.competitors,
    });

    const result = await prisma.result.create({
      data: {
        promptId: prompt.id,
        engine: payload.engine,
        isMentioned: parsed.is_mentioned,
        hasCitation: parsed.has_citation,
        rankPosition: parsed.rank_position,
        rawText: output.text || "(empty engine response)",
        citations: parsed.cited_domains.length > 0 ? parsed.cited_domains : output.citations,
      },
      include: {
        prompt: { include: { project: true } },
      },
    });

    return NextResponse.json({
      result: toResultRow(result),
      parsed,
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 502;
    return jsonError(errorMessage(error, "Engine run failed."), status);
  }
}
