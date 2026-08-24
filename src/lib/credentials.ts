import type { Prisma } from "@prisma/client";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { ApiKeys } from "@/lib/types";

export const WORKSPACE_CREDENTIAL_ID = "workspace";

export const EMPTY_KEYS: ApiKeys = { perplexity: "", openai: "", gemini: "" };

export type KeyHints = {
  perplexity: string | null;
  openai: string | null;
  gemini: string | null;
};

export type KeyPatch = Partial<Record<keyof ApiKeys, string | null>>;

function last4(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(-4);
}

export function hintsFromKeys(keys: ApiKeys): KeyHints {
  return {
    perplexity: last4(keys.perplexity),
    openai: last4(keys.openai),
    gemini: last4(keys.gemini),
  };
}

export function configuredFromHints(hints: KeyHints) {
  return {
    perplexity: Boolean(hints.perplexity),
    openai: Boolean(hints.openai),
    gemini: Boolean(hints.gemini),
  };
}

export async function readWorkspaceHints(): Promise<KeyHints> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
  });
  const hint = (row?.hint ?? {}) as Partial<KeyHints>;
  return {
    perplexity: hint.perplexity ?? null,
    openai: hint.openai ?? null,
    gemini: hint.gemini ?? null,
  };
}

export async function readWorkspaceKeys(): Promise<ApiKeys> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
  });
  if (!row?.ciphertext) return { ...EMPTY_KEYS };
  const parsed = decryptJson<Partial<ApiKeys>>(row.ciphertext);
  return {
    perplexity: parsed.perplexity ?? "",
    openai: parsed.openai ?? "",
    gemini: parsed.gemini ?? "",
  };
}

export async function upsertWorkspaceKeys(patch: KeyPatch): Promise<KeyHints> {
  const current = await readWorkspaceKeys();
  const next: ApiKeys = { ...current };

  (Object.keys(EMPTY_KEYS) as (keyof ApiKeys)[]).forEach((field) => {
    if (!(field in patch)) return;
    const value = patch[field];
    if (value === null) {
      next[field] = "";
      return;
    }
    if (typeof value === "string" && value.trim()) {
      next[field] = value.trim();
    }
  });

  const ciphertext = encryptJson(next);
  const hint = hintsFromKeys(next);

  await prisma.credential.upsert({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    create: {
      id: WORKSPACE_CREDENTIAL_ID,
      ciphertext,
      hint: hint as Prisma.InputJsonValue,
    },
    update: {
      ciphertext,
      hint: hint as Prisma.InputJsonValue,
    },
  });

  return hint;
}
