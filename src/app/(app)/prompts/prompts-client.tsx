"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ACTIVE_BRAND_KEY, ACTIVE_PROJECT_KEY, CATEGORY_META } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@prisma/client";

type BrandOption = { id: string; name: string };

type PromptRow = {
  id: string;
  text: string;
  category: PromptCategory;
  brandId: string;
  brand: { id: string; name: string };
};

const CATEGORIES = Object.keys(CATEGORY_META) as PromptCategory[];

function readActiveBrandId() {
  return window.localStorage.getItem(ACTIVE_BRAND_KEY) ?? window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

function writeActiveBrandId(id: string) {
  window.localStorage.setItem(ACTIVE_BRAND_KEY, id);
}

function CategoryToggle({
  value,
  onChange,
}: {
  value: PromptCategory;
  onChange: (value: PromptCategory) => void;
}) {
  return (
    <div
      className="flex items-center rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label="Prompt type"
    >
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={cn(
            "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all duration-200",
            value === category
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-pressed={value === category}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CATEGORY_META[category].dotClass)} />
          {CATEGORY_META[category].label}
        </button>
      ))}
    </div>
  );
}

export function PromptsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBrandId = searchParams.get("brandId");
  const urlBrandIdRef = useRef(urlBrandId);
  urlBrandIdRef.current = urlBrandId;

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandId, setBrandId] = useState("");
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PromptRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PromptRow | null>(null);
  const [draftCategory, setDraftCategory] = useState<PromptCategory>("category");
  const [draftText, setDraftText] = useState("");

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const brandsRes = await fetch("/api/brands");
      const brandsPayload = (await brandsRes.json()) as { brands?: BrandOption[]; error?: string };
      if (!brandsRes.ok) throw new Error(brandsPayload.error || "Failed to load brands.");
      const list = (brandsPayload.brands ?? []).map((item) => ({ id: item.id, name: item.name }));
      setBrands(list);

      const requested = preferredId ?? urlBrandIdRef.current ?? readActiveBrandId();
      const selected = list.find((item) => item.id === requested) ?? list[0] ?? null;
      if (!selected) {
        setBrandId("");
        setPrompts([]);
        return;
      }

      setBrandId(selected.id);
      writeActiveBrandId(selected.id);
      if (urlBrandIdRef.current !== selected.id) {
        router.replace(`/prompts?brandId=${selected.id}`);
      }

      const promptsRes = await fetch(`/api/prompts?brandId=${selected.id}`);
      const promptsPayload = (await promptsRes.json()) as { prompts?: PromptRow[]; error?: string };
      if (!promptsRes.ok) throw new Error(promptsPayload.error || "Failed to load prompts.");
      setPrompts(promptsPayload.prompts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load prompts.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!urlBrandId || !brandId || urlBrandId === brandId) return;
    void load(urlBrandId);
  }, [urlBrandId, brandId, load]);

  const selectedBrandName = useMemo(
    () => brands.find((item) => item.id === brandId)?.name,
    [brands, brandId],
  );

  function onBrandChange(id: string) {
    writeActiveBrandId(id);
    router.replace(`/prompts?brandId=${id}`);
    void load(id);
  }

  function openCreate() {
    setDraftCategory("category");
    setDraftText("");
    setCreating(true);
  }

  function openEdit(row: PromptRow) {
    setEditing(row);
    setDraftCategory(row.category);
    setDraftText(row.text);
  }

  async function saveCreate() {
    const text = draftText.trim();
    if (!brandId) {
      toast.error("Select a brand first.");
      return;
    }
    if (!text) {
      toast.error("Prompt text cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, text, category: draftCategory }),
      });
      const payload = (await response.json()) as { prompt?: PromptRow; error?: string };
      if (!response.ok || !payload.prompt) throw new Error(payload.error || "Could not add prompt.");
      setCreating(false);
      toast.success("Prompt added.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const text = draftText.trim();
    if (!text) {
      toast.error("Prompt text cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/prompts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: draftCategory }),
      });
      const payload = (await response.json()) as { prompt?: PromptRow; error?: string };
      if (!response.ok || !payload.prompt) throw new Error(payload.error || "Could not save prompt.");
      setPrompts((current) =>
        current.map((item) => (item.id === editing.id ? { ...item, ...payload.prompt! } : item)),
      );
      setEditing(null);
      toast.success("Prompt saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/prompts/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Delete failed.");
      }
      setPrompts((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.success("Prompt deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete prompt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Prompts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Probes sent to AI engines during a scan. Add, edit, or delete for the selected brand.
            Deleting a prompt also deletes its scan results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {brands.length > 0 ? (
            <Select value={brandId || undefined} onValueChange={onBrandChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button onClick={openCreate} disabled={!brandId}>
            <Plus />
            Add prompt
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : prompts.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        {brands.length === 0 ? (
                          <>
                            Add a brand in{" "}
                            <Link href="/brands" className="text-foreground underline-offset-4 hover:underline">
                              Brands
                            </Link>{" "}
                            first, then generate or create prompts.
                          </>
                        ) : selectedBrandName ? (
                          `No prompts for ${selectedBrandName} yet.`
                        ) : (
                          "No prompts yet."
                        )}
                      </TableCell>
                    </TableRow>
                  )
                : prompts.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant={row.category}>{CATEGORY_META[row.category].label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[42rem]">
                        <p className="truncate" title={row.text}>
                          {row.text}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleting(row)}
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

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!open && !saving) setCreating(false);
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add prompt</DialogTitle>
            <DialogDescription>
              {selectedBrandName
                ? `This probe will be included the next time you scan ${selectedBrandName}.`
                : "This probe will be included the next time you scan the brand."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <CategoryToggle value={draftCategory} onChange={setDraftCategory} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-prompt">Prompt</Label>
              <Textarea
                id="new-prompt"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                className="min-h-[96px]"
                placeholder="e.g. Best tools for AI search visibility?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveCreate()} disabled={saving || !draftText.trim()}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                {saving ? "Adding…" : "Add prompt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !saving) setEditing(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit prompt</DialogTitle>
            <DialogDescription>
              {editing ? `Stored probe for ${editing.brand.name}.` : "Edit this probe."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <CategoryToggle value={draftCategory} onChange={setDraftCategory} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-prompt">Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                className="min-h-[96px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving || !draftText.trim()}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleting(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
            <DialogDescription>
              This removes the probe and all of its scan results
              {deleting ? ` for ${deleting.brand.name}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={() => void confirmDelete()}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}