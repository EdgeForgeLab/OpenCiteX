"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { ResultsTable } from "@/components/dashboard/results-table";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PrintText } from "@/components/ui/print-text";
import { Progress } from "@/components/ui/progress";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useRunQueue } from "@/hooks/use-run-queue";
import type { DashboardMetrics, ResultRow } from "@/lib/metrics";
import { computeMetrics } from "@/lib/metrics";
import { ACTIVE_PROJECT_KEY, ENGINE_META, type EngineId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  targetDomain: string;
  competitors: string[];
  prompts?: { id: string; text: string }[];
};

export function DashboardClient() {
  const { hydrated, configured } = useApiKeys();
  const queue = useRunQueue();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [engines, setEngines] = useState<EngineId[]>(["perplexity", "openai", "gemini"]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projectsRes = await fetch("/api/projects");
      const projectsPayload = (await projectsRes.json()) as {
        projects?: Project[];
        error?: string;
      };
      if (!projectsRes.ok) throw new Error(projectsPayload.error || "Failed to load projects.");

      const storedId =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
      const selected =
        projectsPayload.projects?.find((item) => item.id === storedId) ??
        projectsPayload.projects?.[0] ??
        null;

      if (!selected) {
        setProject(null);
        setRows([]);
        setMetrics(null);
        return;
      }

      window.localStorage.setItem(ACTIVE_PROJECT_KEY, selected.id);
      const dashRes = await fetch(`/api/dashboard?projectId=${selected.id}`);
      const dashPayload = (await dashRes.json()) as {
        project: Project;
        rows: ResultRow[];
        metrics: DashboardMetrics;
        error?: string;
      };
      if (!dashRes.ok) throw new Error(dashPayload.error || "Failed to load dashboard.");
      setProject(dashPayload.project);
      setRows(dashPayload.rows);
      setMetrics(dashPayload.metrics);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedEngines = useMemo(
    () => engines.filter((engine) => configured[engine]),
    [engines, configured],
  );

  const liveMetrics = useMemo(() => (rows.length ? computeMetrics(rows) : metrics), [rows, metrics]);

  function toggleEngine(engine: EngineId) {
    setEngines((current) =>
      current.includes(engine) ? current.filter((item) => item !== engine) : [...current, engine],
    );
  }

  async function handleRun() {
    if (!project) {
      toast.error("Create a project in Settings first.");
      return;
    }
    const promptRes = await fetch(`/api/prompts?projectId=${project.id}`);
    const promptPayload = (await promptRes.json()) as {
      prompts?: { id: string; text: string }[];
      error?: string;
    };
    if (!promptRes.ok) {
      toast.error(promptPayload.error || "Could not load prompts.");
      return;
    }
    if (!promptPayload.prompts?.length) {
      toast.error("Add prompts before running a scan.");
      return;
    }
    if (selectedEngines.length === 0) {
      toast.error("Select an engine that has a saved API key.");
      return;
    }

    await queue.run({
      prompts: promptPayload.prompts,
      engines: selectedEngines,
      onResult: (row) => {
        setRows((current) => {
          const next = current.filter(
            (item) => !(item.promptId === row.promptId && item.engine === row.engine),
          );
          return [row, ...next];
        });
      },
    });
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GEO radar</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Visibility dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {project
              ? (
                <>
                  Tracking {project.name} on{" "}
                  <span className="font-mono text-foreground">{project.targetDomain}</span>.
                  Mention and citation rates only count probes that do not name your brand.
                </>
              )
              : "Create a workspace in Settings to start measuring AI citations."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {queue.running ? (
            <Button variant="outline" onClick={queue.stop}>
              <Square className="h-3.5 w-3.5" />
              Stop queue
            </Button>
          ) : (
            <Button onClick={() => void handleRun()} disabled={!hydrated || loading}>
              <Play className="h-3.5 w-3.5" />
              Run sequential scan
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(ENGINE_META) as EngineId[]).map((engine) => {
          const active = engines.includes(engine);
          const ready = configured[engine];
          return (
            <button
              key={engine}
              type="button"
              onClick={() => toggleEngine(engine)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-xs transition-all duration-200 ease-out hover:-translate-y-px",
                active && ready
                  ? "border-border bg-accent text-foreground hover:bg-muted"
                  : "border-border text-muted-foreground hover:border-ring hover:bg-accent hover:text-foreground",
              )}
            >
              {ENGINE_META[engine].label}
              {!ready ? " · no key" : ""}
            </button>
          );
        })}
        <Link
          href="/settings"
          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-ring hover:bg-accent hover:text-foreground"
        >
          Manage keys
        </Link>
      </div>

      {queue.running && (
        <div className="print-feed mb-6 overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
            <PrintText
              key={queue.current?.id ?? "idle"}
              text={`> PRINT ${queue.completed}/${queue.total} :: ${queue.current?.engine ?? "idle"} :: ${queue.current?.promptText ?? "standby"}`}
              speed={10}
              className="min-w-0 truncate text-foreground"
            />
            <span className="shrink-0">{queue.errors} errors</span>
          </div>
          <Progress value={queue.progress * 100} />
        </div>
      )}

      <MetricsCards metrics={liveMetrics} loading={loading && !queue.running} />

      <div className="mt-6">
        <ResultsTable
          rows={rows}
          loading={loading && rows.length === 0}
          runningKey={queue.activeKey}
          targetDomain={project?.targetDomain ?? ""}
        />
      </div>
    </AppShell>
  );
}
