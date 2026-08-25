import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn, formatPercent } from "@/lib/utils";
import { Hash, Quote, Radar, Swords } from "lucide-react";
import { PrintText } from "@/components/ui/print-text";

const VALUE = "font-mono text-3xl tabular-nums tracking-tight";

function RateBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-teal-600/80 transition-all dark:bg-teal-400/70"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

export function MetricsCards({
  metrics,
  loading,
}: {
  metrics: DashboardMetrics | null;
  loading: boolean;
}) {
  const hasProbes = Boolean(metrics && metrics.unpromptedRuns > 0);
  const hasMarket = Boolean(metrics && metrics.marketRuns > 0);
  const visibilityLow = hasProbes && metrics!.visibilityScore < 0.8;
  const rankWarn = hasProbes && (metrics!.averageRank == null || metrics!.averageRank > 3);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            AI visibility
            <InfoTip label="About AI visibility">
              Share of the latest unprompted answers that mention your brand. Unprompted means the
              probe text does not name you. Mentions use name and alias matching; an analysis model
              can catch paraphrases if you configured one. Prompts that already name the brand are
              excluded.
            </InfoTip>
          </CardTitle>
          <Radar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <div
              className={cn(
                VALUE,
                hasProbes ? "text-sky-800 dark:text-sky-300" : "text-muted-foreground",
              )}
            >
              <PrintText
                key={String(metrics?.visibilityScore)}
                text={hasProbes ? formatPercent(metrics!.visibilityScore) : "—"}
                speed={22}
              />
            </div>
          )}
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {hasProbes
              ? `${metrics!.mentionedCount}/${metrics!.unpromptedRuns} unprompted mentions`
              : "Brand-named prompts are excluded."}
          </p>
          {visibilityLow ? (
            <p className="mt-1 text-xs text-sky-800/80 dark:text-sky-300/80">
              Below 80% — category answers often skip you.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            Citation rate
            <InfoTip label="About citation rate">
              Share of those same unprompted answers that cite your official domain as a URL.
              Saying the brand name without a clickable official link does not count. Uses the
              latest result for each probe and engine.
            </InfoTip>
          </CardTitle>
          <Quote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <div
              className={cn(
                VALUE,
                hasProbes ? "text-teal-800 dark:text-teal-300" : "text-muted-foreground",
              )}
            >
              <PrintText
                key={String(metrics?.citationRate)}
                text={hasProbes ? formatPercent(metrics!.citationRate) : "—"}
                speed={22}
              />
            </div>
          )}
          <RateBar value={hasProbes ? metrics!.citationRate : 0} />
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {hasProbes
              ? `${metrics!.citedCount}/${metrics!.unpromptedRuns} answers cite your domain`
              : "No unprompted probes in this scan."}
          </p>
          {hasProbes && metrics!.mentionedCount > metrics!.citedCount ? (
            <p className="mt-1 text-xs text-teal-800/80 dark:text-teal-300/80">
              Mentioned without a clickable official URL.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            Interception rate
            <InfoTip label="About interception rate">
              Share of category and scenario probes that do not name your brand, where you are not
              mentioned but a listed competitor is. Brand and competitor probes are not included.
              The competitor named most often is shown below the number.
            </InfoTip>
          </CardTitle>
          <Swords className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <div
              className={cn(
                VALUE,
                hasMarket ? "text-rose-800 dark:text-rose-300" : "text-muted-foreground",
              )}
            >
              <PrintText
                key={String(metrics?.interceptionRate)}
                text={hasMarket ? formatPercent(metrics!.interceptionRate) : "—"}
                speed={22}
              />
            </div>
          )}
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {hasMarket
              ? `${metrics!.interceptCount}/${metrics!.marketRuns} category/scenario answers name a competitor instead`
              : "Needs category or scenario probes."}
          </p>
          {metrics?.topInterceptor ? (
            <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-300/80">
              Most often intercepted by {metrics.topInterceptor}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            Avg. citation rank
            <InfoTip label="About average citation rank">
              Mean position of your official domain among cited hosts, only in unprompted answers
              that do cite you. #1 is the first source listed, not an AI-generated ranking.
              Unranked means no official-domain citations yet.
            </InfoTip>
          </CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <div
              className={cn(
                VALUE,
                hasProbes && metrics!.averageRank != null
                  ? "text-indigo-800 dark:text-indigo-300"
                  : "text-muted-foreground",
              )}
            >
              <PrintText
                key={String(metrics?.averageRank)}
                text={
                  hasProbes && metrics!.averageRank != null
                    ? `#${metrics!.averageRank.toFixed(1)}`
                    : "Unranked"
                }
                speed={22}
              />
            </div>
          )}
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {metrics?.rankedCount
              ? `Mean position among ${metrics.rankedCount} cited sources, not a numbered AI list`
              : "No official-domain citations yet."}
          </p>
          {rankWarn ? (
            <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-300/80">
              Outside the first three cited sources — or not cited.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}