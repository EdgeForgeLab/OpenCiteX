import { queryGemini } from "@/lib/engines/gemini";
import { queryOpenAI } from "@/lib/engines/openai";
import { queryPerplexity } from "@/lib/engines/perplexity";
import type { ApiKeys, EngineId, EngineOutput } from "@/lib/types";

export async function queryEngine(
  engine: EngineId,
  keys: ApiKeys,
  prompt: string,
): Promise<EngineOutput> {
  switch (engine) {
    case "perplexity":
      if (!keys.perplexity) throw new Error("Missing Perplexity API key.");
      return queryPerplexity(keys.perplexity, prompt);
    case "openai":
      if (!keys.openai) throw new Error("Missing OpenAI API key.");
      return queryOpenAI(keys.openai, prompt);
    case "gemini":
      if (!keys.gemini) throw new Error("Missing Gemini API key.");
      return queryGemini(keys.gemini, prompt);
    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
}
