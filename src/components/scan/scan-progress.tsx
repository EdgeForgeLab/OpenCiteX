"use client";

import { PrintText } from "@/components/ui/print-text";
import { Progress } from "@/components/ui/progress";
import { ProviderLogo } from "@/components/providers/provider-logo";
import type { QueueItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScanProgress({
  completed,
  total,
  current,
  errors,
  brandName,
  compact = false,
}: {
  completed: number;
  total: number;
  current: QueueItem | null;
  errors: number;
  brandName?: string | null;
  compact?: boolean;
}) {
  const percent = total ? (completed / total) * 100 : 0;
  const line = `> PRINT ${completed}/${total} :: ${current?.engine ?? "idle"} :: ${current?.promptText ?? "standby"}`;

  return (
    <div
      className={cn(
        "print-feed overflow-hidden rounded-xl border border-border bg-card",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {current ? <ProviderLogo id={current.engine} className="h-3.5 w-3.5" /> : null}
          <PrintText
            key={current?.id ?? "idle"}
            text={brandName ? `> ${brandName} ${line}` : line}
            speed={10}
            className="min-w-0 truncate text-foreground"
          />
        </div>
        <span className="shrink-0">{errors} errors</span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
