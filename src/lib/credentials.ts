import type { Prisma } from "@prisma/client";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  emptyHints,
  emptyKeys,
  normalizeAnalyzer,
  normalizePaceMs,
  PROVIDER_IDS,
  type ApiKeys,
  type KeyHints,
  type ProviderId,
  type ProviderPaceMs,
} from "@/lib/types";

export const WORKSPACE_CREDENTIAL_ID = "workspace";
export const EMPTY_KEYS = emptyKeys();

export type { KeyHints };
export type KeyPatch = Partial<Record<ProviderId, string | null>>;

function last4(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(-4);
}

export function hintsFromKeys(keys: ApiKeys): KeyHints {
  return Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, last4(keys[id])]),
  ) as KeyHints;
}

export function configuredFromHints(hints: KeyHints) {
  return Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, Boolean(hints[id])]),
  ) as Record<ProviderId, boolean>;
}

export async function readWorkspaceHints(): Promise<KeyHints> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
  });
  const hint = (row?.hint ?? {}) as Partial<KeyHints>;
  return {
    ...emptyHints(),
    ...hint,
  };
}

export async function readWorkspaceKeys(): Promise<ApiKeys> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
  });
  if (!row?.ciphertext) return emptyKeys();
  const parsed = decryptJson<Partial<ApiKeys>>(row.ciphertext);
  return {
    ...emptyKeys(),
    ...parsed,
  };
}

export async function readWorkspacePace(): Promise<ProviderPaceMs> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    select: { pace: true },
  });
  return normalizePaceMs(row?.pace);
}

export async function readWorkspaceAnalyzer(): Promise<ProviderId | null> {
  const row = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    select: { analyzer: true },
  });
  const analyzer = normalizeAnalyzer(row?.analyzer);
  if (!analyzer) return null;
  const keys = await readWorkspaceKeys();
  return keys[analyzer] ? analyzer : null;
}

export async function upsertWorkspaceAnalyzer(next: ProviderId | null): Promise<ProviderId | null> {
  if (next) {
    const keys = await readWorkspaceKeys();
    if (!keys[next]) {
      throw new Error(`Save a ${next} API key before using it as the analysis model.`);
    }
  }

  const existing = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    select: { id: true },
  });

  if (existing) {
    await prisma.credential.update({
      where: { id: WORKSPACE_CREDENTIAL_ID },
      data: { analyzer: next },
    });
    return next;
  }

  await prisma.credential.create({
    data: {
      id: WORKSPACE_CREDENTIAL_ID,
      ciphertext: encryptJson(emptyKeys()),
      hint: emptyHints() as Prisma.InputJsonValue,
      analyzer: next,
    },
  });
  return next;
}

export async function upsertWorkspacePace(patch: Partial<ProviderPaceMs>): Promise<ProviderPaceMs> {
  const current = await readWorkspacePace();
  const next = normalizePaceMs({ ...current, ...patch });
  const existing = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    select: { id: true },
  });

  if (existing) {
    await prisma.credential.update({
      where: { id: WORKSPACE_CREDENTIAL_ID },
      data: { pace: next as Prisma.InputJsonValue },
    });
    return next;
  }

  await prisma.credential.create({
    data: {
      id: WORKSPACE_CREDENTIAL_ID,
      ciphertext: encryptJson(emptyKeys()),
      hint: emptyHints() as Prisma.InputJsonValue,
      pace: next as Prisma.InputJsonValue,
    },
  });
  return next;
}

export async function upsertWorkspaceKeys(patch: KeyPatch): Promise<KeyHints> {
  const current = await readWorkspaceKeys();
  const next: ApiKeys = { ...current };

  PROVIDER_IDS.forEach((field) => {
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
  const existing = await prisma.credential.findUnique({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    select: { analyzer: true },
  });
  const currentAnalyzer = normalizeAnalyzer(existing?.analyzer);
  const analyzer = currentAnalyzer && next[currentAnalyzer] ? currentAnalyzer : null;

  await prisma.credential.upsert({
    where: { id: WORKSPACE_CREDENTIAL_ID },
    create: {
      id: WORKSPACE_CREDENTIAL_ID,
      ciphertext,
      hint: hint as Prisma.InputJsonValue,
      analyzer,
    },
    update: {
      ciphertext,
      hint: hint as Prisma.InputJsonValue,
      analyzer,
    },
  });

  return hint;
}
