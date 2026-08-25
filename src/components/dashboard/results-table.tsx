"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Check, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { RawOutputDialog } from "@/components/dashboard/raw-output-dialog";
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
  prompted: MessageSquare,
  hidden: Ban,
};

const STATUS_TONE = {
  cited: "text-emerald-400",
  mentioned: "text-amber-400",
  prompted: "text-slate-500 dark:text-slate-300",
  hidden: "text-rose-400",
} as const;

const STATUS_ORDER = ["cited", "mentioned", "prompted", "hidden"] as const;

export function ResultsTable({
  rows,
  loading,
  runningKey,
  showBrand = false,
  showTime = false,
  pageSize,
  emptyTitle = "No engine results yet",
  emptyHint = "Save a brand, paste API keys, then run a sequential scan.",
}: {
  rows: ResultRow[];
  loading: boolean;
  runningKey: string | null;
  showBrand?: boolean;
  showTime?: boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleRows = useMemo(() => {
    if (!pageSize) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
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
        <p className="font-sans text-2xl font-semibold tracking-tight">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5">
        {STATUS_ORDER.map((status) => {
          const Icon = STATUS_ICON[status];
          return (
            <span key={status} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Icon className={cn("h-3.5 w-3.5", STATUS_TONE[status])} />
              {STATUS_LABEL[status]}
            </span>
          );
        })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {showTime ? <TableHead>Time</TableHead> : null}
            {showBrand ? <TableHead>Brand</TableHead> : null}
            <TableHead className="min-w-[280px]">Prompt</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead className="w-14 text-center">Status</TableHead>
            <TableHead className="whitespace-nowrap">Intercepted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => {
            const StatusIcon = STATUS_ICON[row.status];
            const categoryMeta = CATEGORY_META[row.category as keyof typeof CATEGORY_META];
            return (
              <TableRow key={row.id} className="print-row">
                {showTime ? (
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                ) : null}
                {showBrand ? <TableCell className="whitespace-nowrap text-sm">{row.brandName}</TableCell> : null}
                <TableCell className="w-full">
                  <p
                    className="w-0 min-w-full truncate text-sm leading-relaxed text-foreground"
                    title={row.promptText}
                  >
                    <Badge
                      variant={row.category as keyof typeof CATEGORY_META}
                      className="relative -top-px mr-2 inline-flex px-2 py-0 text-[10px] font-medium"
                    >
                      {categoryMeta?.label ?? row.category}
                    </Badge>
                    {row.rankPosition > 0 ? (
                      <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                        #{row.rankPosition}
                      </span>
                    ) : null}
                    {row.promptText}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <ProviderLogo id={row.engine} className="h-4 w-4 shrink-0" />
                    <div>
                      <span className={cn("text-sm", ENGINE_META[row.engine].accent)}>
                        {ENGINE_META[row.engine].label}
                      </span>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {ENGINE_META[row.engine].model}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    title={STATUS_LABEL[row.status]}
                    className={cn("inline-flex items-center justify-center", STATUS_TONE[row.status])}
                  >
                    <StatusIcon className="h-4 w-4" />
                    <span className="sr-only">{STATUS_LABEL[row.status]}</span>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {row.interceptedBy ? (
                    <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-400">
                      {row.interceptedBy}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <RawOutputDialog row={row} />
                </TableCell>
              </TableRow>
            );
          })}
          {runningKey && !rows.some((row) => `${row.promptId}:${row.engine}` === runningKey) && (
            <TableRow>
              <TableCell colSpan={5 + (showBrand ? 1 : 0) + (showTime ? 1 : 0)}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pageSize && rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
              Prev
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
