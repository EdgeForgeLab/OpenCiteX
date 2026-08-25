"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanContext, type ScanContextValue } from "@/components/scan/context";
import { ScanDrawer } from "@/components/scan/scan-drawer";
import { ScanWidget } from "@/components/scan/scan-widget";
import { useRunQueue } from "@/hooks/use-run-queue";
import type { JobRecord } from "@/lib/jobs";
import type { EngineId } from "@/lib/types";

export function ScanProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queue = useRunQueue();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetBrandId, setPresetBrandId] = useState<string | undefined>();
  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);

  const openDrawer = useCallback(
    (preset?: { brandId?: string }) => {
      if (queue.running) {
        toast.message("A scan is already running.");
        return;
      }
      setPresetBrandId(preset?.brandId);
      setDrawerOpen(true);
    },
    [queue.running],
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const startScan = useCallback(
    async (input: { brandId: string; brandName: string; engines: EngineId[] }) => {
      setStarting(true);
      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandId: input.brandId, engines: input.engines }),
        });
        const payload = (await response.json()) as {
          job?: JobRecord;
          prompts?: { id: string; text: string }[];
          error?: string;
        };
        if (!response.ok || !payload.job || !payload.prompts) {
          throw new Error(payload.error || "Could not start scan.");
        }

        setJobId(payload.job.id);
        setBrandName(input.brandName);
        setDrawerOpen(false);
        router.push("/scans");

        await queue.run({
          jobId: payload.job.id,
          prompts: payload.prompts,
          engines: input.engines,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not start scan.");
      } finally {
        setStarting(false);
      }
    },
    [queue, router],
  );

  const value = useMemo<ScanContextValue>(
    () => ({
      drawerOpen,
      presetBrandId,
      openDrawer,
      closeDrawer,
      startScan,
      starting,
      running: queue.running,
      jobId,
      brandName,
      completed: queue.completed,
      total: queue.total,
      errors: queue.errors,
      progress: queue.progress,
      current: queue.current,
      stop: queue.stop,
    }),
    [
      drawerOpen,
      presetBrandId,
      openDrawer,
      closeDrawer,
      startScan,
      starting,
      queue.running,
      queue.completed,
      queue.total,
      queue.errors,
      queue.progress,
      queue.current,
      queue.stop,
      jobId,
      brandName,
    ],
  );

  return (
    <ScanContext.Provider value={value}>
      {children}
      <ScanDrawer />
      <ScanWidget />
    </ScanContext.Provider>
  );
}

export { useScan } from "@/components/scan/context";
