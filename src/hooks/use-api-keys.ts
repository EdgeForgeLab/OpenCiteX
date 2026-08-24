"use client";

import { useCallback, useEffect, useState } from "react";
import { KEYS_STORAGE_KEY, type ApiKeys } from "@/lib/types";

type KeyHints = {
  perplexity: string | null;
  openai: string | null;
  gemini: string | null;
};

type Configured = Record<keyof ApiKeys, boolean>;

const EMPTY_HINTS: KeyHints = { perplexity: null, openai: null, gemini: null };
const EMPTY_CONFIGURED: Configured = { perplexity: false, openai: false, gemini: false };

function configuredFromHints(hints: KeyHints): Configured {
  return {
    perplexity: Boolean(hints.perplexity),
    openai: Boolean(hints.openai),
    gemini: Boolean(hints.gemini),
  };
}

function readLegacyKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEYS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApiKeys>;
    const keys: ApiKeys = {
      perplexity: parsed.perplexity?.trim() ?? "",
      openai: parsed.openai?.trim() ?? "",
      gemini: parsed.gemini?.trim() ?? "",
    };
    if (!keys.perplexity && !keys.openai && !keys.gemini) return null;
    return keys;
  } catch {
    return null;
  }
}

export function useApiKeys() {
  const [hints, setHints] = useState<KeyHints>(EMPTY_HINTS);
  const [hydrated, setHydrated] = useState(false);

  const applyHints = useCallback((next: KeyHints) => {
    setHints(next);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const response = await fetch("/api/credentials");
        const payload = (await response.json()) as {
          hints?: KeyHints;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Could not load keys.");

        let next = payload.hints ?? EMPTY_HINTS;
        const hasServerKey = Boolean(next.perplexity || next.openai || next.gemini);
        const legacy = readLegacyKeys();

        if (!hasServerKey && legacy) {
          const migrate = await fetch("/api/credentials", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(legacy),
          });
          const migrated = (await migrate.json()) as { hints?: KeyHints; error?: string };
          if (migrate.ok && migrated.hints) {
            next = migrated.hints;
            window.localStorage.removeItem(KEYS_STORAGE_KEY);
          }
        } else if (legacy) {
          window.localStorage.removeItem(KEYS_STORAGE_KEY);
        }

        applyHints(next);
      } catch {
        applyHints(EMPTY_HINTS);
      } finally {
        setHydrated(true);
      }
    }
    void boot();
  }, [applyHints]);

  const saveKeys = useCallback(async (patch: Partial<Record<keyof ApiKeys, string | null>>) => {
    const response = await fetch("/api/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = (await response.json()) as { hints?: KeyHints; error?: string };
    if (!response.ok || !payload.hints) {
      throw new Error(payload.error || "Could not save keys.");
    }
    applyHints(payload.hints);
    window.localStorage.removeItem(KEYS_STORAGE_KEY);
    return payload.hints;
  }, [applyHints]);

  return {
    hints,
    saveKeys,
    hydrated,
    configured: configuredFromHints(hints),
  };
}
