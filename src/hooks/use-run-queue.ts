"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { QUEUE_DELAY_MS, emptyPaceMs, type EngineId, type QueueItem, type ProviderPaceMs } from "@/lib/types";
import type { ResultRow } from "@/lib/metrics";
import { sleep } from "@/lib/utils";

type RunState = {
  running: boolean;
  current: QueueItem | null;
  completed: number;
  total: number;
  errors: number;
  activeKey: string | null;
};

const IDLE: RunState = {
  running: false,
  current: null,
  completed: 0,
  total: 0,
  errors: 0,
  activeKey: null,
};

async function patchJob(
  jobId: string | undefined,
  body: Record<string, unknown>,
) {
  if (!jobId) return;
  try {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Progress persistence is best-effort; the scan continues.
  }
}

export function useRunQueue() {
  const [state, setState] = useState<RunState>(IDLE);
  const abortRef = useRef(false);

  const progress = useMemo(() => {
    if (!state.total) return 0;
    return state.completed / state.total;
  }, [state.completed, state.total]);

  const stop = useCallback(() => {
    abortRef.current = true;
  }, []);

  const run = useCallback(
    async (input: {
      prompts: { id: string; text: string }[];
      engines: EngineId[];
      jobId?: string;
      onResult?: (row: ResultRow) => void;
    }) => {
      const items: QueueItem[] = input.prompts.flatMap((prompt) =>
        input.engines.map((engine) => ({
          id: `${prompt.id}:${engine}`,
          promptId: prompt.id,
          promptText: prompt.text,
          engine,
        })),
      );

      if (items.length === 0) {
        toast.error("Nothing to run. Add a brand and select at least one engine.");
        return;
      }

      abortRef.current = false;
      setState({
        running: true,
        current: items[0] ?? null,
        completed: 0,
        total: items.length,
        errors: 0,
        activeKey: items[0]?.id ?? null,
      });

      let errors = 0;
      let completed = 0;
      const lastEnded = new Map<EngineId, number>();
      let paceMs: ProviderPaceMs = emptyPaceMs();
      let analyzer: EngineId | null = null;
      try {
        const credRes = await fetch("/api/credentials");
        const credPayload = (await credRes.json()) as {
          paceMs?: ProviderPaceMs;
          analyzer?: EngineId | null;
        };
        if (credRes.ok && credPayload.paceMs) {
          paceMs = { ...emptyPaceMs(), ...credPayload.paceMs };
        }
        if (credRes.ok && credPayload.analyzer) analyzer = credPayload.analyzer;
      } catch {
        // Fall back to defaults if pace cannot be loaded.
      }

      for (let index = 0; index < items.length; index += 1) {
        if (abortRef.current) break;
        const item = items[index];
        const waitFor = analyzer && analyzer !== item.engine ? [item.engine, analyzer] : [item.engine];
        for (const engine of waitFor) {
          const previousEnd = lastEnded.get(engine);
          const interval = paceMs[engine] ?? QUEUE_DELAY_MS;
          if (previousEnd != null) {
            const wait = previousEnd + interval - Date.now();
            if (wait > 0 && !abortRef.current) await sleep(wait);
          }
        }
        if (abortRef.current) break;
        setState((prev) => ({ ...prev, current: item, activeKey: item.id }));
        await patchJob(input.jobId, {
          currentPrompt: item.promptText,
          currentEngine: item.engine,
        });

        let usedAnalyzer = false;
        try {
          const response = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              promptId: item.promptId,
              engine: item.engine,
              jobId: input.jobId,
            }),
          });
          const payload = (await response.json()) as {
            result?: ResultRow;
            analyzed?: boolean;
            error?: string;
          };
          if (!response.ok || !payload.result) {
            throw new Error(payload.error || "Engine run failed.");
          }
          usedAnalyzer = Boolean(payload.analyzed);
          input.onResult?.(payload.result);
        } catch (error) {
          errors += 1;
          toast.error(
            `${item.engine} failed: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }

        completed = index + 1;
        const ended = Date.now();
        lastEnded.set(item.engine, ended);
        if (usedAnalyzer && analyzer) lastEnded.set(analyzer, ended);
        setState((prev) => ({
          ...prev,
          completed,
          errors,
        }));
        await patchJob(input.jobId, { completed, errors });
      }

      const cancelled = abortRef.current;
      await patchJob(input.jobId, {
        status: cancelled ? "cancelled" : "completed",
        completed,
        errors,
        currentPrompt: null,
        currentEngine: null,
      });

      setState((prev) => ({
        ...prev,
        running: false,
        current: null,
        activeKey: null,
      }));

      if (cancelled) {
        toast.message("Queue stopped.");
      } else if (errors === 0) {
        toast.success("Visibility scan complete.");
      } else {
        toast.message(`Scan finished with ${errors} error${errors === 1 ? "" : "s"}.`);
      }
    },
    [],
  );

  return { ...state, progress, run, stop };
}
