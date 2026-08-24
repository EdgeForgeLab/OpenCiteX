"use client";

import { AlertTriangle, Ban, Check, ExternalLink, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResultRow } from "@/lib/metrics";
import { CATEGORY_META, ENGINE_META } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  cited: "Cited",
  mentioned: "Mentioned",
  prompted: "Prompted, not cited",
  hidden: "Not visible",
} as const;

const STATUS_ICON = {
  cited: Check,
  mentioned: AlertTriangle,
  prompted: AlertTriangle,
  hidden: Ban,
};

const ROW_ACCENT = {
  cited: "bg-emerald-500/10 hover:bg-emerald-500/15",
  mentioned: "bg-amber-500/10 hover:bg-amber-500/15",
  prompted: "bg-slate-500/10 hover:bg-slate-500/15",
  hidden: "bg-rose-500/10 hover:bg-rose-500/15",
};

function metacitexHref(prompt: string, domain: string) {
  const url = new URL("https://metacitex.com/generate");
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("domain", domain);
  url.searchParams.set("ref", "opencitex");
  return url.toString();
}

export function ResultsTable({
  rows,
  loading,
  runningKey,
  targetDomain,
}: {
  rows: ResultRow[];
  loading: boolean;
  runningKey: string | null;
  targetDomain: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0 && !runningKey) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="font-sans text-2xl font-semibold tracking-tight">No engine results yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add prompts, paste BYOK keys, then run a sequential scan from the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[280px]">Prompt</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Intercepted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const needsFix = row.brandCued ? !row.hasCitation : !row.isMentioned || !row.hasCitation;
            const StatusIcon = STATUS_ICON[row.status];
            const categoryMeta = CATEGORY_META[row.category as keyof typeof CATEGORY_META];
            return (
              <TableRow key={row.id} className={cn("print-row", ROW_ACCENT[row.status])}>
                <TableCell>
                  <p className="max-w-xl text-sm leading-relaxed text-foreground">{row.promptText}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11px]">
                    <Badge
                      variant={row.category as keyof typeof CATEGORY_META}
                      className="px-2 py-0 text-[10px] font-medium"
                    >
                      {categoryMeta?.label ?? row.category}
                    </Badge>
                    {row.rankPosition > 0 ? (
                      <span className="font-mono text-muted-foreground">#{row.rankPosition}</span>
                    ) : null}
                  </p>
                </TableCell>
                <TableCell>
                  <span className={cn("text-sm", ENGINE_META[row.engine].accent)}>
                    {ENGINE_META[row.engine].label}
                  </span>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {ENGINE_META[row.engine].model}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={row.status} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {STATUS_LABEL[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {row.interceptedBy ? (
                    <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-400">
                      {row.interceptedBy}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Raw
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Engine output</DialogTitle>
                          <DialogDescription>
                            {ENGINE_META[row.engine].label} · {row.citations.length} citation
                            {row.citations.length === 1 ? "" : "s"}
                          </DialogDescription>
                        </DialogHeader>
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
                          {row.rawText}
                        </pre>
                        {row.citations.length > 0 && (
                          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                            {row.citations.map((citation) => (
                              <li key={citation}>{citation}</li>
                            ))}
                          </ul>
                        )}
                      </DialogContent>
                    </Dialog>
                    {needsFix && (
                      <Button variant="cta" size="sm" asChild>
                        <a
                          href={metacitexHref(row.promptText, targetDomain)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Zap />
                          Fix with Metacitex
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {runningKey && !rows.some((row) => `${row.promptId}:${row.engine}` === runningKey) && (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
