"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_BRAND_KEY, PROBE_LANGUAGES, probeLanguage, probeLanguageLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@prisma/client";

type Probe = {
  id: string;
  text: string;
  category: PromptCategory;
};

type Brand = {
  id: string;
  name: string;
  targetDomain: string;
  aliases: string[];
  competitors: string[];
  industryCategory: string | null;
  description: string | null;
  language: string;
  prompts?: Probe[];
  _count?: { prompts: number };
};

type BrandForm = {
  name: string;
  targetDomain: string;
  aliases: string;
  competitors: string;
  industryCategory: string;
  description: string;
  language: string;
};

const EMPTY_FORM: BrandForm = {
  name: "",
  targetDomain: "",
  aliases: "",
  competitors: "",
  industryCategory: "",
  description: "",
  language: "en",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formFromBrand(brand: Brand): BrandForm {
  return {
    name: brand.name,
    targetDomain: brand.targetDomain,
    aliases: brand.aliases.join(", "),
    competitors: brand.competitors.join(", "),
    industryCategory: brand.industryCategory ?? "",
    description: brand.description ?? "",
    language: probeLanguage(brand.language),
  };
}

function writeActiveBrandId(id: string) {
  window.localStorage.setItem(ACTIVE_BRAND_KEY, id);
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch("/api/brands");
      const payload = (await response.json()) as { brands?: Brand[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load brands.");
      setBrands(payload.brands ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load brands.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm(formFromBrand(brand));
    setDialogOpen(true);
  }

  async function persist() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        targetDomain: form.targetDomain,
        aliases: splitList(form.aliases),
        competitors: splitList(form.competitors),
        industryCategory: form.industryCategory,
        description: form.description,
        language: form.language,
      };
      const response = await fetch(editingId ? `/api/brands/${editingId}` : "/api/brands", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        brand?: Brand;
        error?: string;
      };
      if (!response.ok || !payload.brand) throw new Error(payload.error || "Could not save brand.");
      writeActiveBrandId(payload.brand.id);
      toast.success(editingId ? "Brand updated." : "Brand created.");
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBrand(id: string) {
    if (!window.confirm("Delete this brand and its scan results?")) return;
    try {
      const response = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Delete failed.");
      }
      toast.success("Brand deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each brand has its own domain, aliases, competitors, and probes. Creating a brand
            generates a starting set you can edit afterwards.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add brand
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit brand" : "Add brand"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update brand details. Prompts stay as saved unless you edit them under Prompts."
                : "Saving generates Brand, Category, Competitor, and Scenario probes from these fields. You can edit them after."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <section className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Basics
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="MetaCitex"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Official domain</Label>
                  <Input
                    id="domain"
                    value={form.targetDomain}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetDomain: event.target.value }))
                    }
                    className="font-mono"
                    placeholder="metacitex.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="aliases">Aliases / keywords</Label>
                    <InfoTip label="About aliases">
                      Other names the brand might appear as in AI answers: nicknames, product names,
                      abbreviations, former names. Separate with commas. Used for mention matching — skip
                      generic words like GEO, AI, or SEO.
                    </InfoTip>
                    <span className="text-xs font-normal text-muted-foreground">optional</span>
                  </div>
                  <Input
                    id="aliases"
                    value={form.aliases}
                    onChange={(event) => setForm((current) => ({ ...current, aliases: event.target.value }))}
                    placeholder="MetaCitex, OpenCiteX"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="competitors">Competitors</Label>
                    <InfoTip label="About competitors">
                      Comma-separated competitor names. Used to detect when a category or scenario answer
                      names a rival instead of your brand, and to seed Competitor probes.
                    </InfoTip>
                    <span className="text-xs font-normal text-muted-foreground">optional</span>
                  </div>
                  <Input
                    id="competitors"
                    value={form.competitors}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, competitors: event.target.value }))
                    }
                    placeholder="Profound, Goodie AI, Peec AI"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Probe config
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editingId
                    ? "Used when the brand was created. Existing probes are not overwritten."
                    : "These fields generate the starting Brand, Category, Competitor, and Scenario probes."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Probe language</Label>
                <div className="flex w-full rounded-md border border-input p-0.5">
                  {PROBE_LANGUAGES.map((language) => (
                    <button
                      key={language.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, language: language.id }))}
                      className={cn(
                        "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
                        probeLanguage(form.language) === language.id
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="industry">Industry category</Label>
                  <InfoTip label="About industry category">
                    The market or category your brand competes in, used to generate Category probes like
                    “best tools for …”. Example: AI search visibility tracking.
                  </InfoTip>
                  <span className="text-xs font-normal text-muted-foreground">optional</span>
                </div>
                <Input
                  id="industry"
                  value={form.industryCategory}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, industryCategory: event.target.value }))
                  }
                  placeholder="AI search visibility tracking"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="description">Positioning / job to be done</Label>
                  <InfoTip label="About positioning">
                    The customer job or problem you solve, used to generate Scenario probes like “how do
                    I …”. Example: monitor whether ChatGPT cites my domain.
                  </InfoTip>
                  <span className="text-xs font-normal text-muted-foreground">optional</span>
                </div>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="monitor whether ChatGPT cites my domain"
                />
              </div>
            </section>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={() => void persist()}
                disabled={saving || form.name.trim().length < 1 || form.targetDomain.trim().length < 3}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {editingId ? "Saving…" : "Creating…"}
                  </>
                ) : editingId ? (
                  "Save brand"
                ) : (
                  "Create brand"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-2 rounded-xl border border-border p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No brands yet. Add one to generate probes and run scans.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <p className="font-medium">{brand.name}</p>
                    {brand.aliases.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">{brand.aliases.join(", ")}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{brand.targetDomain}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {brand.industryCategory || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{probeLanguageLabel(brand.language)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/prompts?brandId=${brand.id}`}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          Prompts ({brand._count?.prompts ?? brand.prompts?.length ?? 0})
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(brand)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-rose-500/10 hover:text-rose-400"
                        onClick={() => void removeBrand(brand.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
