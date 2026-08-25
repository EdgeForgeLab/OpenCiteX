import { NextResponse } from "next/server";
import { z } from "zod";
import { engineSchema, errorMessage, jsonError } from "@/lib/api";
import { unauthorizedIfGuest } from "@/lib/auth";
import {
  readWorkspaceAnalyzer,
  readWorkspaceKeys,
  readWorkspacePace,
} from "@/lib/credentials";
import { queryEngine } from "@/lib/engines";
import { parseVisibility } from "@/lib/parser";
import { markProviderFinished, waitProviderGap } from "@/lib/pace-gate";
import { prisma } from "@/lib/prisma";
import { toResultRow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const runSchema = z.object({
  promptId: z.string().min(1),
  engine: engineSchema,
  jobId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const guest = await unauthorizedIfGuest();
  if (guest) return guest;
  try {
    const payload = runSchema.parse(await request.json());
    const prompt = await prisma.prompt.findUnique({
      where: { id: payload.promptId },
      include: { brand: true },
    });

    if (!prompt) return jsonError("Prompt not found.", 404);

    if (payload.jobId) {
      const job = await prisma.job.findUnique({ where: { id: payload.jobId } });
      if (!job) return jsonError("Job not found.", 404);
      if (job.status === "cancelled") return jsonError("Job was cancelled.", 409);
    }

    const [keys, analyzer, paceMs] = await Promise.all([
      readWorkspaceKeys(),
      readWorkspaceAnalyzer(),
      readWorkspacePace(),
    ]);
    const engineKey = keys[payload.engine];
    if (!engineKey) {
      return jsonError(`No ${payload.engine} API key saved in Settings.`, 400);
    }

    const output = await queryEngine(payload.engine, keys, prompt.text);
    markProviderFinished(payload.engine);

    const baseInput = {
      text: output.text,
      citations: output.citations,
      brandName: prompt.brand.name,
      aliases: prompt.brand.aliases,
      targetDomain: prompt.brand.targetDomain,
      competitors: prompt.brand.competitors,
    };

    let parsed = await parseVisibility(baseInput);
    let analyzed = false;
    const analyzerKey = analyzer ? keys[analyzer] : "";
    if (!parsed.is_mentioned && analyzer && analyzerKey) {
      await waitProviderGap(analyzer, paceMs[analyzer]);
      parsed = await parseVisibility({
        ...baseInput,
        analyzerId: analyzer,
        analyzerKey,
      });
      analyzed = true;
      markProviderFinished(analyzer);
    }

    const result = await prisma.result.create({
      data: {
        promptId: prompt.id,
        jobId: payload.jobId,
        engine: payload.engine,
        isMentioned: parsed.is_mentioned,
        hasCitation: parsed.has_citation,
        rankPosition: parsed.rank_position,
        rawText: output.text || "(empty engine response)",
        citations: parsed.cited_domains.length > 0 ? parsed.cited_domains : output.citations,
      },
      include: {
        prompt: { include: { brand: true } },
      },
    });

    return NextResponse.json({
      result: toResultRow(result),
      parsed,
      analyzed,
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 502;
    return jsonError(errorMessage(error, "Engine run failed."), status);
  }
}