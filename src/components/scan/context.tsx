"use client";

import { createContext, useContext } from "react";
import type { QueueItem } from "@/lib/types";
import type { EngineId } from "@/lib/types";

export type ScanContextValue = {
  drawerOpen: boolean;
  presetBrandId?: string;
  openDrawer: (preset?: { brandId?: string }) => void;
  closeDrawer: () => void;
  startScan: (input: { brandId: string; brandName: string; engines: EngineId[] }) => Promise<void>;
  starting: boolean;
  running: boolean;
  jobId: string | null;
  brandName: string | null;
  completed: number;
  total: number;
  errors: number;
  progress: number;
  current: QueueItem | null;
  stop: () => void;
};

export const ScanContext = createContext<ScanContextValue | null>(null);

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error("useScan must be used within ScanProvider.");
  }
  return context;
}
