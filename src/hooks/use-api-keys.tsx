"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyHints,
  emptyKeys,
  emptyPaceMs,
  KEYS_STORAGE_KEY,
  PROVIDER_IDS,
  type ApiKeys,
  type KeyHints,
  type ProviderId,
  type ProviderPaceMs,
} from "@/lib/types";

type Configured = Record<ProviderId, boolean>;

function configuredFromHints(hints: KeyHints): Configured {
  return Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, Boolean(hints[id])]),
  ) as Configured;
}

function readLegacyKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEYS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApiKeys>;
    const keys = { ...emptyKeys(), ...parsed };
    if (!PROVIDER_IDS.some((id) => keys[id]?.trim())) return null;
    return keys;
  } catch {
    return null;
  }
}

type CredentialsPayload = {
  hints?: KeyHints;
  paceMs?: ProviderPaceMs;
  analyzer?: ProviderId | null;
  error?: string;
};

type RefreshResult = {
  hints: KeyHints;
  configured: Configured;
  paceMs: ProviderPaceMs;
  analyzer: ProviderId | null;
};

type ApiKeysContextValue = {
  hints: KeyHints;
  paceMs: ProviderPaceMs;
  analyzer: ProviderId | null;
  saveKeys: (patch: Partial<Record<ProviderId, string | null>>) => Promise<KeyHints>;
  savePace: (patch: Partial<ProviderPaceMs>) => Promise<ProviderPaceMs>;
  saveAnalyzer: (next: ProviderId | null) => Promise<ProviderId | null>;
  refresh: () => Promise<RefreshResult>;
  hydrated: boolean;
  configured: Configured;
};

const CredentialsContext = createContext<ApiKeysContextValue | null>(null);

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [hints, setHints] = useState<KeyHints>(emptyHints());
  const [paceMs, setPaceMs] = useState<ProviderPaceMs>(emptyPaceMs());
  const [analyzer, setAnalyzer] = useState<ProviderId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const applyHints = useCallback((next: KeyHints) => {
    setHints({ ...emptyHints(), ...next });
  }, []);

  const applyPayload = useCallback(
    (payload: CredentialsPayload) => {
      if (payload.hints) applyHints(payload.hints);
      if (payload.paceMs) setPaceMs({ ...emptyPaceMs(), ...payload.paceMs });
      if ("analyzer" in payload) setAnalyzer(payload.analyzer ?? null);
    },
    [applyHints],
  );

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    const empty = {
      hints: emptyHints(),
      configured: configuredFromHints(emptyHints()),
      paceMs: emptyPaceMs(),
      analyzer: null as ProviderId | null,
    };
    try {
      const response = await fetch("/api/credentials");
      const payload = (await response.json()) as CredentialsPayload;
      if (!response.ok) throw new Error(payload.error || "Could not load keys.");

      let next = { ...emptyHints(), ...(payload.hints ?? {}) };
      const nextPace = payload.paceMs ? { ...emptyPaceMs(), ...payload.paceMs } : emptyPaceMs();
      const nextAnalyzer = "analyzer" in payload ? (payload.analyzer ?? null) : null;
      const hasServerKey = PROVIDER_IDS.some((id) => next[id]);
      const legacy = readLegacyKeys();

      if (!hasServerKey && legacy) {
        const migrate = await fetch("/api/credentials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(legacy),
        });
        const migrated = (await migrate.json()) as { hints?: KeyHints; error?: string };
        if (migrate.ok && migrated.hints) {
          next = { ...emptyHints(), ...migrated.hints };
          window.localStorage.removeItem(KEYS_STORAGE_KEY);
        }
      } else if (legacy) {
        window.localStorage.removeItem(KEYS_STORAGE_KEY);
      }

      applyHints(next);
      setPaceMs(nextPace);
      if ("analyzer" in payload) setAnalyzer(nextAnalyzer);
      return {
        hints: next,
        configured: configuredFromHints(next),
        paceMs: nextPace,
        analyzer: nextAnalyzer,
      };
    } catch {
      applyHints(empty.hints);
      return empty;
    } finally {
      setHydrated(true);
    }
  }, [applyHints]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveKeys = useCallback(
    async (patch: Partial<Record<ProviderId, string | null>>) => {
      const response = await fetch("/api/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as CredentialsPayload;
      if (!response.ok || !payload.hints) {
        throw new Error(payload.error || "Could not save keys.");
      }
      applyPayload(payload);
      window.localStorage.removeItem(KEYS_STORAGE_KEY);
      return payload.hints;
    },
    [applyPayload],
  );

  const savePace = useCallback(
    async (patch: Partial<ProviderPaceMs>) => {
      const response = await fetch("/api/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paceMs: patch }),
      });
      const payload = (await response.json()) as CredentialsPayload;
      if (!response.ok || !payload.paceMs) {
        throw new Error(payload.error || "Could not save interval.");
      }
      applyPayload(payload);
      return payload.paceMs;
    },
    [applyPayload],
  );

  const saveAnalyzer = useCallback(
    async (next: ProviderId | null) => {
      const response = await fetch("/api/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyzer: next }),
      });
      const payload = (await response.json()) as CredentialsPayload;
      if (!response.ok) {
        throw new Error(payload.error || "Could not save analysis model.");
      }
      applyPayload(payload);
      return payload.analyzer ?? null;
    },
    [applyPayload],
  );

  const configured = useMemo(() => configuredFromHints(hints), [hints]);

  const value = useMemo<ApiKeysContextValue>(
    () => ({
      hints,
      paceMs,
      analyzer,
      saveKeys,
      savePace,
      saveAnalyzer,
      refresh,
      hydrated,
      configured,
    }),
    [hints, paceMs, analyzer, saveKeys, savePace, saveAnalyzer, refresh, hydrated, configured],
  );

  return <CredentialsContext.Provider value={value}>{children}</CredentialsContext.Provider>;
}

export function useApiKeys() {
  const ctx = useContext(CredentialsContext);
  if (!ctx) {
    throw new Error("useApiKeys must be used within CredentialsProvider");
  }
  return ctx;
}
