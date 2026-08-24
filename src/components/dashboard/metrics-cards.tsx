import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/lib/metrics";
import { formatPercent } from "@/lib/utils";
import { Quote, Radar, Swords } from "lucide-react";
import { PrintText } from "@/components/ui/print-text";

export function MetricsCards({
  metrics,
  loading,
}: {
  metrics: DashboardMetrics | null;
  loading: boolean;
}) {
  const hasProbes = Boolean(metrics && metrics.unpromptedRuns > 0);
  const items = [
    {
      label: "Unprompted mention rate",
      value: hasProbes ? formatPercent(metrics!.visibilityScore) : "—",
      hint: hasProbes
        ? `${metrics!.mentionedCount}/${metrics!.unpromptedRuns} answers name you without being asked`
        : "Brand-named prompts are excluded. Add category probes.",
      icon: Radar,
      mono: true,
    },
    {
      label: "Unprompted citation rate",
      value: hasProbes ? formatPercent(metrics!.citationRate) : "—",
      hint: hasProbes
        ? `${metrics!.citedCount}/${metrics!.unpromptedRuns} answers cite your domain`
        : "No unprompted probes in this scan.",
      icon: Quote,
      mono: true,
    },
    {
      label: "Top intercepting competitor",
      value: metrics?.topInterceptor ?? "None detected",
      hint: "Who appears on unprompted probes when you do not",
      icon: Swords,
      mono: Boolean(metrics?.topInterceptor),
      critical: Boolean(metrics?.topInterceptor),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <div
                className={
                  item.mono
                    ? "font-mono text-3xl tabular-nums tracking-tight text-foreground"
                    : "font-sans text-3xl font-semibold tracking-tight text-foreground"
                }
              >
                {item.critical ? (
                  <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 text-rose-400">
                    <PrintText key={item.value} text={item.value} speed={18} caret={false} />
                  </span>
                ) : (
                  <PrintText key={item.value} text={item.value} speed={22} />
                )}
              </div>
            )}
            <p className="mt-2 font-mono text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
