"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { VisibilityTrend } from "@/components/dashboard/visibility-trend";
import { ProviderVisibilityTrend } from "@/components/dashboard/provider-visibility-trend";
import { useScan } from "@/components/scan/context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics, EngineVisibilityPoint, VisibilityHistoryPoint } from "@/lib/metrics";
import { ACTIVE_BRAND_KEY, ACTIVE_PROJECT_KEY, type EngineId } from "@/lib/types";

type Brand = {
  id: string;
  name: string;
  targetDomain: string;
};

function readActiveBrandId() {
  return window.localStorage.getItem(ACTIVE_BRAND_KEY) ?? window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

function writeActiveBrandId(id: string) {
  window.localStorage.setItem(ACTIVE_BRAND_KEY, id);
}

export function DashboardClient() {
  const scan = useScan();
  const wasRunning = useRef(false);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [competitorNames, setCompetitorNames] = useState<string[]>([]);
  const [history, setHistory] = useState<VisibilityHistoryPoint[]>([]);
  const [engineHistory, setEngineHistory] = useState<EngineVisibilityPoint[]>([]);
  const [, setHistoryEngines] = useState<EngineId[]>([]);

  const load = useCallback(async (brandId?: string) => {
    setLoading(true);
    try {
      const brandsRes = await fetch("/api/brands");
      const brandsPayload = (await brandsRes.json()) as {
        brands?: Brand[];
        error?: string;
      };
      if (!brandsRes.ok) throw new Error(brandsPayload.error || "Failed to load brands.");
      const list = brandsPayload.brands ?? [];
      setBrands(list);

      const storedId = brandId ?? readActiveBrandId();
      const selected = list.find((item) => item.id === storedId) ?? list[0] ?? null;

      if (!selected) {
        setBrand(null);
        setMetrics(null);
        setHistory([]);
        setEngineHistory([]);
        setHistoryEngines([]);
        setCompetitorNames([]);
        return;
      }

      setBrand(selected);
      writeActiveBrandId(selected.id);
      const dashRes = await fetch(`/api/dashboard?brandId=${selected.id}`);
      const dashPayload = (await dashRes.json()) as {
        brand: Brand;
        metrics: DashboardMetrics;
        history?: {
          competitorNames?: string[];
          points?: VisibilityHistoryPoint[];
          engines?: EngineId[];
          enginePoints?: EngineVisibilityPoint[];
        };
        error?: string;
      };
      if (!dashRes.ok) throw new Error(dashPayload.error || "Failed to load dashboard.");
      setBrand(dashPayload.brand);
      setMetrics(dashPayload.metrics);
      setCompetitorNames(dashPayload.history?.competitorNames ?? []);
      setHistory(dashPayload.history?.points ?? []);
      setHistoryEngines(dashPayload.history?.engines ?? []);
      setEngineHistory(dashPayload.history?.enginePoints ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (scan.running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current) return;
    wasRunning.current = false;
    void load();
  }, [scan.running, load]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GEO radar</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Visibility dashboard</h1>
          <div className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {loading && brands.length === 0 && !brand ? (
              <>
                <Skeleton className="h-4 w-[28rem] max-w-full" />
                <Skeleton className="mt-2 h-4 w-[18rem] max-w-full" />
              </>
            ) : brand ? (
              <p>
                Tracking {brand.name} on{" "}
                <span className="font-mono text-foreground">{brand.targetDomain}</span>.
                Visibility, citations, intercepts, and rank exclude prompts that name your brand.
              </p>
            ) : (
              <p>
                Add a brand in{" "}
                <Link href="/brands" className="text-foreground underline-offset-4 hover:underline">
                  Brands
                </Link>{" "}
                to start measuring AI citations.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {brands.length > 0 ? (
            <Select
              value={brand?.id}
              onValueChange={(id) => {
                writeActiveBrandId(id);
                void load(id);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {scan.running ? (
            <Button variant="outline" onClick={scan.stop}>
              <Square className="h-3.5 w-3.5" />
              Stop queue
            </Button>
          ) : (
            <Button onClick={() => scan.openDrawer({ brandId: brand?.id })} disabled={loading}>
              <Play className="h-3.5 w-3.5" />
              Run scan
            </Button>
          )}
        </div>
      </div>

      <MetricsCards metrics={metrics} loading={loading && !scan.running} />

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <VisibilityTrend
          brandName={brand?.name ?? "Your brand"}
          competitorNames={competitorNames}
          points={history}
          loading={loading && history.length === 0}
        />
        <ProviderVisibilityTrend
          points={engineHistory}
          loading={loading && engineHistory.length === 0}
        />
      </div>
    </>
  );
}