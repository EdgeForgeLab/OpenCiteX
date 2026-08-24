"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { QUEUE_DELAY_MS, type EngineId, type QueueItem } from "@/lib/types";
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
      onResult: (row: ResultRow) => void;
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
        toast.error("Nothing to run. Add prompts and select at least one engine.");
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
      for (let index = 0; index < items.length; index += 1) {
        if (abortRef.current) break;
        const item = items[index];
        setState((prev) => ({ ...prev, current: item, activeKey: item.id }));

        try {
          const response = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              promptId: item.promptId,
              engine: item.engine,
            }),
          });
          const payload = (await response.json()) as {
            result?: ResultRow;
            error?: string;
          };
          if (!response.ok || !payload.result) {
            throw new Error(payload.error || "Engine run failed.");
          }
          input.onResult(payload.result);
        } catch (error) {
          errors += 1;
          toast.error(
            `${item.engine} failed: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }

        setState((prev) => ({
          ...prev,
          completed: index + 1,
          errors,
        }));

        if (index < items.length - 1 && !abortRef.current) {
          await sleep(QUEUE_DELAY_MS);
        }
      }

      setState((prev) => ({
        ...prev,
        running: false,
        current: null,
        activeKey: null,
      }));

      if (abortRef.current) {
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
