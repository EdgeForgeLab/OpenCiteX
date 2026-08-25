"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { useScan } from "@/components/scan/context";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ENGINE_META, PROVIDER_IDS, type EngineId } from "@/lib/types";
import { cn } from "@/lib/utils";

type BrandOption = { id: string; name: string; targetDomain: string };

export function ScanDrawer() {
  const scan = useScan();
  const { configured, hydrated, refresh } = useApiKeys();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [engines, setEngines] = useState<EngineId[]>([]);
  const [promptCount, setPromptCount] = useState(0);
  const [loadingBrands, setLoadingBrands] = useState(false);

  useEffect(() => {
    if (!scan.drawerOpen) return;
    setLoadingBrands(true);
    void fetch("/api/brands")
      .then(async (response) => {
        const payload = (await response.json()) as { brands?: (BrandOption & { _count?: { prompts: number } })[] };
        const list = payload.brands ?? [];
        setBrands(list);
        const preferred =
          list.find((item) => item.id === scan.presetBrandId) ?? list[0] ?? null;
        setBrandId(preferred?.id ?? "");
      })
      .finally(() => setLoadingBrands(false));
  }, [scan.drawerOpen, scan.presetBrandId]);

  useEffect(() => {
    if (!scan.drawerOpen) return;
    let cancelled = false;
    void refresh().then((payload) => {
      if (cancelled) return;
      setEngines(PROVIDER_IDS.filter((id) => payload.configured[id]));
    });
    return () => {
      cancelled = true;
    };
  }, [scan.drawerOpen, refresh]);

  useEffect(() => {
    if (!brandId) {
      setPromptCount(0);
      return;
    }
    void fetch(`/api/prompts?brandId=${brandId}`)
      .then(async (response) => {
        const payload = (await response.json()) as { prompts?: unknown[] };
        setPromptCount(payload.prompts?.length ?? 0);
      })
      .catch(() => setPromptCount(0));
  }, [brandId]);

  const selectedBrand = brands.find((item) => item.id === brandId) ?? null;
  const readyEngines = useMemo(
    () => engines.filter((engine) => configured[engine]),
    [engines, configured],
  );
  const total = promptCount * readyEngines.length;

  function toggleEngine(engine: EngineId) {
    if (!configured[engine]) return;
    setEngines((current) =>
      current.includes(engine) ? current.filter((item) => item !== engine) : [...current, engine],
    );
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity",
          scan.drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={scan.closeDrawer}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-card shadow-lg transition-transform duration-200 ease-out",
          scan.drawerOpen ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
        aria-hidden={!scan.drawerOpen}
      >
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scan</p>
          <h2 className="mt-1 font-sans text-2xl font-semibold tracking-tight">Run scan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sequential BYOK calls, one probe × provider at a time. Each run is stored as a scan plus results.
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={brandId || undefined} onValueChange={setBrandId} disabled={loadingBrands}>
              <SelectTrigger>
                <SelectValue placeholder={loadingBrands ? "Loading…" : "Select a brand"} />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBrand ? (
              <p className="font-mono text-[11px] text-muted-foreground">{selectedBrand.targetDomain}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Providers</Label>
            <div className="flex flex-col gap-2">
              {PROVIDER_IDS.map((engine) => {
                const active = engines.includes(engine);
                const ready = configured[engine];
                return (
                  <button
                    key={engine}
                    type="button"
                    onClick={() => toggleEngine(engine)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active && ready
                        ? "border-border bg-accent text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/60",
                      !ready && "opacity-60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ProviderLogo id={engine} className="h-4 w-4" />
                      {ENGINE_META[engine].label}
                    </span>
                    <span className="font-mono text-[11px]">
                      {ready ? (active ? "on" : "off") : "no key"}
                    </span>
                  </button>
                );
              })}
            </div>
            {!hydrated || PROVIDER_IDS.some((id) => configured[id]) ? null : (
              <p className="text-xs text-muted-foreground">
                Save keys in{" "}
                <Link href="/byok" className="underline-offset-4 hover:underline" onClick={scan.closeDrawer}>
                  API Keys
                </Link>{" "}
                first.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {promptCount} probes × {readyEngines.length} providers = {total} calls
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={scan.closeDrawer}>
            Cancel
          </Button>
          <Button
            disabled={scan.starting || !brandId || readyEngines.length === 0 || total === 0}
            onClick={() => {
              if (!selectedBrand) return;
              void scan.startScan({
                brandId: selectedBrand.id,
                brandName: selectedBrand.name,
                engines: readyEngines,
              });
            }}
          >
            <Play className="h-3.5 w-3.5" />
            {scan.starting ? "Starting…" : "Start scan"}
          </Button>
        </div>
      </aside>
    </>
  );
}
