"use client";

import { useMemo } from "react";
import { Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { Skeleton } from "@/components/ui/skeleton";
import type { EngineVisibilityPoint } from "@/lib/metrics";
import { ENGINE_META, PROVIDER_IDS, type EngineId } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

const ENGINE_COLORS: Record<EngineId, string> = {
  perplexity: "#1FB8CD",
  openai: "#10a37f",
  gemini: "#8E75B2",
  deepseek: "#4D6BFE",
  qwen: "#615CED",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function localDayKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastSevenDayKeys() {
  const keys: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * DAY_MS);
    keys.push(localDayKey(day.toISOString()));
  }
  return keys;
}

function MiniSparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const width = 88;
  const height = 28;
  const pad = 2;
  const lastIndex = [...values.keys()].reverse().find((index) => values[index] != null) ?? -1;
  if (lastIndex < 0) {
    return <div className="h-7 w-[88px] shrink-0" />;
  }

  const xAt = (index: number) =>
    pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
  const yAt = (value: number) => height - pad - value * (height - pad * 2);

  const segments: string[] = [];
  let drawing = false;
  values.forEach((value, index) => {
    if (value == null) {
      drawing = false;
      return;
    }
    const command = drawing ? "L" : "M";
    segments.push(`${command} ${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`);
    drawing = true;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      {segments.length > 0 ? (
        <path
          d={segments.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      <circle cx={xAt(lastIndex)} cy={yAt(values[lastIndex]!)} r="2.1" fill={color} />
    </svg>
  );
}

type ProviderRow = {
  engine: EngineId;
  trend: (number | null)[];
  latest: number | null;
  previous: number | null;
};

export function ProviderVisibilityTrend({
  points,
  loading,
}: {
  points: EngineVisibilityPoint[];
  loading: boolean;
}) {
  const rows = useMemo<ProviderRow[]>(() => {
    const days = lastSevenDayKeys();
    const cutoff = Date.now() - 7 * DAY_MS;

    return PROVIDER_IDS.map((engine) => {
      const series = points
        .map((point) => {
          const match = point.engines.find((item) => item.engine === engine);
          return match ? { at: point.at, value: match.value } : null;
        })
        .filter((item): item is { at: string; value: number } => Boolean(item));

      const byDay = new Map<string, number>();
      for (const item of series) {
        if (new Date(item.at).getTime() < cutoff) continue;
        byDay.set(localDayKey(item.at), item.value);
      }

      return {
        engine,
        trend: days.map((day) => byDay.get(day) ?? null),
        latest: series.at(-1)?.value ?? null,
        previous: series.at(-2)?.value ?? null,
      };
    });
  }, [points]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            Visibility by provider
            <InfoTip label="About provider visibility">
              Unprompted mention rate for each engine. The sparkline is the last 7 days. The percent
              is the latest scan that included that provider; the change is versus the scan before
              that.
            </InfoTip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Last 7 days · latest scan</p>
        </div>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {PROVIDER_IDS.map((engine) => (
              <Skeleton key={engine} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div>
            {rows.map((row) => {
              const delta =
                row.latest == null || row.previous == null ? null : row.latest - row.previous;
              const up = delta != null && delta > 0.0005;
              const down = delta != null && delta < -0.0005;

              return (
                <div
                  key={row.engine}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-0 last:pb-0 first:pt-0"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
                      <ProviderLogo id={row.engine} className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm font-medium">{ENGINE_META[row.engine].label}</span>
                  </span>
                  <MiniSparkline values={row.trend} color={ENGINE_COLORS[row.engine]} />
                  <span
                    className={cn(
                      "w-12 shrink-0 text-right font-mono text-sm tabular-nums",
                      row.latest == null ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {row.latest == null ? "—" : formatPercent(row.latest)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex w-[4.25rem] shrink-0 items-center justify-end gap-0.5 font-mono text-xs tabular-nums",
                      up && "text-teal-700 dark:text-teal-300",
                      down && "text-rose-700 dark:text-rose-300",
                      !up && !down && "text-muted-foreground",
                    )}
                  >
                    {delta == null ? (
                      "—"
                    ) : (
                      <>
                        {up ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : down ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {up ? "+" : down ? "−" : ""}
                        {formatPercent(Math.abs(delta))}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
