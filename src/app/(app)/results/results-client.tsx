"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ResultsTable } from "@/components/dashboard/results-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobRecord } from "@/lib/jobs";
import type { ResultRow, VisibilityStatus } from "@/lib/metrics";
import { ENGINE_META, PROVIDER_IDS, type EngineId } from "@/lib/types";

type BrandOption = { id: string; name: string };

const STATUS_OPTIONS: { value: "all" | VisibilityStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "cited", label: "Cited" },
  { value: "mentioned", label: "Mentioned" },
  { value: "prompted", label: "Prompted, not cited" },
  { value: "hidden", label: "Not visible" },
];

export function ResultsClient() {
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [brandId, setBrandId] = useState("all");
  const [engine, setEngine] = useState<"all" | EngineId>("all");
  const [status, setStatus] = useState<"all" | VisibilityStatus>("all");
  const [scanId, setScanId] = useState("all");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setScanId(searchParams.get("scanId") ?? searchParams.get("jobId") ?? "all");
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/brands").then(async (response) => {
        const payload = (await response.json()) as { brands?: BrandOption[] };
        setBrands(payload.brands ?? []);
      }),
      fetch("/api/jobs").then(async (response) => {
        const payload = (await response.json()) as { jobs?: JobRecord[] };
        setJobs(payload.jobs ?? []);
      }),
    ]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brandId !== "all") params.set("brandId", brandId);
      if (engine !== "all") params.set("engine", engine);
      if (status !== "all") params.set("status", status);
      if (scanId !== "all") params.set("jobId", scanId);
      const response = await fetch(`/api/logs?${params.toString()}`);
      const payload = (await response.json()) as { rows?: ResultRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load results.");
      setRows(payload.rows ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [brandId, engine, status, scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Job</p>
        <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Results</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every engine response is kept. Filter by brand, provider, status, or scan.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger>
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={engine} onValueChange={(value) => setEngine(value as "all" | EngineId)}>
          <SelectTrigger>
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {PROVIDER_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {ENGINE_META[id].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as "all" | VisibilityStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scanId} onValueChange={setScanId}>
          <SelectTrigger>
            <SelectValue placeholder="Scan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scans</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.brandName} · {new Date(job.createdAt).toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResultsTable
        rows={rows}
        loading={loading}
        runningKey={null}
        showBrand
        showTime
        pageSize={20}
        emptyTitle="No results yet"
        emptyHint="Run a scan to capture engine responses. Filters apply to stored results."
      />
    </>
  );
}
