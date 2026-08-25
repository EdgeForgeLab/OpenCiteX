"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useScan } from "@/components/scan/context";
import { ScanProgress } from "@/components/scan/scan-progress";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobRecord } from "@/lib/jobs";
import { ENGINE_META } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<JobRecord["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

const STATUS_CLASS: Record<JobRecord["status"], string> = {
  queued: "border-border text-muted-foreground",
  running: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-border text-muted-foreground",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function ScanPage() {
  const scan = useScan();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs");
      const payload = (await response.json()) as { jobs?: JobRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load scans.");
      setJobs(payload.jobs ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load scans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!scan.running) {
      void load();
      return;
    }
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [scan.running, load]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Job</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Scan</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each sequential run is stored as a scan. Open results to inspect every probe × provider
            response.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scan.running ? (
            <Button variant="outline" onClick={scan.stop}>
              <Square className="h-3.5 w-3.5" />
              Stop queue
            </Button>
          ) : (
            <Button onClick={() => scan.openDrawer()}>
              <Play className="h-3.5 w-3.5" />
              Run scan
            </Button>
          )}
        </div>
      </div>

      {scan.running ? (
        <div className="mb-6">
          <ScanProgress
            completed={scan.completed}
            total={scan.total}
            current={scan.current}
            errors={scan.errors}
            brandName={scan.brandName}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-sans text-2xl font-semibold tracking-tight">No scans yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a sequential scan to create the first record.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Providers</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const live = (scan.running || scan.starting) && scan.jobId === job.id;
                const completed = live ? scan.completed : job.completed;
                const total = live ? scan.total : job.total;
                const status = live ? "running" : job.status === "running" ? "cancelled" : job.status;
                const statusLabel = live
                  ? "Running"
                  : job.status === "running"
                    ? "Interrupted"
                    : STATUS_LABEL[job.status];
                return (
                  <TableRow key={job.id} className={cn(live && "bg-accent/40")}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatWhen(job.startedAt ?? job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">{job.brandName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {job.engines.map((engine) => (
                          <span key={engine} className="inline-flex items-center gap-1 text-xs">
                            <ProviderLogo id={engine} className="h-3.5 w-3.5" />
                            {ENGINE_META[engine].label}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {completed}/{total}
                      {job.errors > 0 || (live && scan.errors > 0)
                        ? ` · ${live ? scan.errors : job.errors} err`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[status]}>
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/results?scanId=${job.id}`}>View results</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
