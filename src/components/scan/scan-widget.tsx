"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Square } from "lucide-react";
import { useScan } from "@/components/scan/context";
import { ScanProgress } from "@/components/scan/scan-progress";
import { Button } from "@/components/ui/button";

export function ScanWidget() {
  const scan = useScan();
  const pathname = usePathname();

  if (!scan.running || pathname === "/scans") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(100%-2rem,22rem)] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link href="/scans" className="text-xs font-medium hover:underline">
          Scan in progress
        </Link>
        <Button variant="outline" size="sm" onClick={scan.stop}>
          <Square className="h-3 w-3" />
          Stop
        </Button>
      </div>
      <ScanProgress
        compact
        completed={scan.completed}
        total={scan.total}
        current={scan.current}
        errors={scan.errors}
        brandName={scan.brandName}
      />
    </div>
  );
}
