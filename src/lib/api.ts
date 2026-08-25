import { NextResponse } from "next/server";
import { z } from "zod";

export const engineSchema = z.enum(["perplexity", "openai", "gemini", "deepseek", "qwen"]);
export const languageSchema = z.enum(["en", "zh", "fr", "es"]);

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function errorMessage(error: unknown, fallback = "Request failed.") {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    if (!issue) return fallback;
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
