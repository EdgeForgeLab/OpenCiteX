"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisibilityHistoryPoint } from "@/lib/metrics";
import { formatPercent } from "@/lib/utils";

const YOU_KEY = "__you__";

const BRAND_COLOR = "#0284c7";
const COMPETITOR_COLORS = ["#64748b", "#0d9488", "#e11d48", "#4f46e5", "#d97706", "#9333ea", "#65a30d"];

type ChartRow = Record<string, string | number | null> & { at: string };

function formatTick(iso: string, showTime: boolean) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (showTime) {
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function VisibilityTrend({
  brandName,
  competitorNames,
  points,
  loading,
}: {
  brandName: string;
  competitorNames: string[];
  points: VisibilityHistoryPoint[];
  loading: boolean;
}) {
  const showTime = useMemo(() => {
    if (points.length < 2) return true;
    const first = new Date(points[0].at).getTime();
    const last = new Date(points[points.length - 1].at).getTime();
    return last - first < 48 * 60 * 60 * 1000;
  }, [points]);

  const data = useMemo<ChartRow[]>(() => {
    return points.map((point) => {
      const row: ChartRow = { at: point.at, [YOU_KEY]: Math.round(point.you * 1000) / 10 };
      const byName = new Map(point.competitors.map((item) => [item.name, item.value]));
      for (const name of competitorNames) {
        const value = byName.get(name);
        row[name] = value == null ? null : Math.round(value * 1000) / 10;
      }
      return row;
    });
  }, [points, competitorNames]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            AI visibility
            <InfoTip label="About visibility trend">
              Unprompted mention rate for each completed scan. The solid line is your brand; dashed
              lines are competitors listed on the brand. Y-axis is percent of answers that mention
              that name.
            </InfoTip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Mention rate over time</p>
        </div>
        <Radar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Run a scan to plot visibility over time.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="h-0.5 w-5 rounded-full" style={{ background: BRAND_COLOR }} />
                {brandName}
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-px text-[10px] font-medium text-sky-800 dark:text-sky-300">
                  You
                </span>
              </span>
              {competitorNames.map((name, index) => (
                <span key={name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="h-px w-5 border-t border-dashed"
                    style={{ borderColor: COMPETITOR_COLORS[index % COMPETITOR_COLORS.length] }}
                  />
                  {name}
                </span>
              ))}
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="at"
                    tickFormatter={(value) => formatTick(String(value), showTime)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--border))" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="mb-1.5 text-muted-foreground">{formatTick(String(label), true)}</p>
                          {payload.map((item) => {
                            const isYou = item.dataKey === YOU_KEY;
                            const name = isYou ? brandName : String(item.name);
                            const value = typeof item.value === "number" ? item.value / 100 : null;
                            return (
                              <p key={String(item.dataKey)} className="flex items-center justify-between gap-6">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: String(item.color) }}
                                  />
                                  {name}
                                  {isYou ? (
                                    <span className="text-[10px] text-sky-800 dark:text-sky-300">You</span>
                                  ) : null}
                                </span>
                                <span className="font-mono tabular-nums">
                                  {value == null ? "—" : formatPercent(value)}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={YOU_KEY}
                    name={brandName}
                    stroke={BRAND_COLOR}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: BRAND_COLOR }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  {competitorNames.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={COMPETITOR_COLORS[index % COMPETITOR_COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}