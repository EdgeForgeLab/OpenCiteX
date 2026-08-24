"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VISIBILITY = [18, 22, 28, 31, 29, 35, 41, 44, 48, 52, 55, 58, 61, 67];
const CITATION = [8, 10, 12, 14, 13, 18, 21, 24, 26, 29, 32, 36, 39, 42];

const ROWS = [
  { prompt: "Best GEO platforms in 2026", status: "cited" as const, label: "Cited" },
  { prompt: "Best tools to track AI visibility", status: "mentioned" as const, label: "Mentioned" },
  { prompt: "How to get cited in AI search", status: "hidden" as const, label: "Hidden" },
];

function toPoints(values: number[], width: number, height: number, max = 100) {
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
}

function Sparkfield() {
  const width = 320;
  const height = 64;
  const vis = toPoints(VISIBILITY, width, height);
  const cite = toPoints(CITATION, width, height);
  const visArea = `0,${height} ${vis} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-label="14-day AI visibility trend">
      <defs>
        <linearGradient id="visFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={visArea} fill="url(#visFill)" />
      <polyline
        points={vis}
        fill="none"
        stroke="rgb(16 185 129)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={cite}
        fill="none"
        stroke="rgb(139 92 246)"
        strokeWidth="1.7"
        strokeDasharray="4 3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeroMonitor() {
  return (
    <div className="hidden w-full lg:block">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-medium">Live visibility</p>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">metacitex.com · 14d</p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            { label: "Visibility", value: "67%" },
            { label: "Citations", value: "42%" },
            { label: "Interceptor", value: "Profound" },
          ].map((item) => (
            <div key={item.label} className="px-3 py-2">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="font-mono text-sm tabular-nums tracking-tight">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="px-3 pt-2">
          <div className="mb-0.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>vis vs cite</span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-2.5 rounded-sm bg-emerald-500" /> vis
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-px w-2.5 border-t border-dashed border-violet-500" /> cite
              </span>
            </span>
          </div>
          <Sparkfield />
        </div>

        <div className="border-t border-border">
          {ROWS.map((row, index) => (
            <div
              key={row.prompt}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-1.5",
                index < ROWS.length - 1 && "border-b border-border",
              )}
            >
              <p className="truncate text-xs">{row.prompt}</p>
              <Badge variant={row.status} className="h-5 shrink-0 px-2 py-0 text-[10px]">
                {row.label}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
