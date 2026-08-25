"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_META } from "@/lib/types";
import type { PromptCategory } from "@prisma/client";

type Probe = {
  id: string;
  text: string;
  category: PromptCategory;
};

const CATEGORIES = Object.keys(CATEGORY_META) as PromptCategory[];

function CategorySelect({
  value,
  onChange,
}: {
  value: PromptCategory;
  onChange: (value: PromptCategory) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PromptCategory)}>
      <SelectTrigger className="h-8 w-[8.5rem] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {CATEGORY_META[category].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProbesDialog({
  brandId,
  brandName,
  open,
  onOpenChange,
  onChanged,
}: {
  brandId: string | null;
  brandName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Probe>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<PromptCategory>("category");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open || !brandId) return;
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/prompts?brandId=${brandId}`)
      .then(async (response) => {
        const payload = (await response.json()) as { prompts?: Probe[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Failed to load probes.");
        if (cancelled) return;
        const list = payload.prompts ?? [];
        setProbes(list);
        setDrafts(Object.fromEntries(list.map((item) => [item.id, item])));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load probes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, brandId]);

  function updateDraft(id: string, patch: Partial<Probe>) {
    setDrafts((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  async function saveProbe(id: string) {
    const draft = drafts[id];
    const original = probes.find((item) => item.id === id);
    if (!draft || !original) return;
    const text = draft.text.trim();
    if (!text) {
      toast.error("Probe text cannot be empty.");
      return;
    }
    setSavingId(id);
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: draft.category }),
      });
      const payload = (await response.json()) as { prompt?: Probe; error?: string };
      if (!response.ok || !payload.prompt) throw new Error(payload.error || "Could not save probe.");
      setProbes((current) => current.map((item) => (item.id === id ? payload.prompt! : item)));
      setDrafts((current) => ({ ...current, [id]: payload.prompt! }));
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeProbe(id: string) {
    if (!window.confirm("Delete this probe and its scan results?")) return;
    try {
      const response = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Delete failed.");
      }
      setProbes((current) => current.filter((item) => item.id !== id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function addProbe() {
    if (!brandId) return;
    const text = newText.trim();
    if (!text) {
      toast.error("Enter a probe before adding it.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, text, category: newCategory }),
      });
      const payload = (await response.json()) as { prompt?: Probe; error?: string };
      if (!response.ok || !payload.prompt) throw new Error(payload.error || "Could not add probe.");
      setProbes((current) => [...current, payload.prompt!]);
      setDrafts((current) => ({ ...current, [payload.prompt!.id]: payload.prompt! }));
      setNewText("");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add failed.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Probes</DialogTitle>
          <DialogDescription>
            Stored prompts for {brandName}. Edit the generated set or add your own. Scans use whatever
            is saved here.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : probes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No probes yet. Add one below.</p>
        ) : (
          <ul className="space-y-3">
            {probes.map((probe) => {
              const draft = drafts[probe.id] ?? probe;
              const dirty = draft.text !== probe.text || draft.category !== probe.category;
              return (
                <li key={probe.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <CategorySelect
                      value={draft.category}
                      onChange={(category) => updateDraft(probe.id, { category })}
                    />
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!dirty || savingId === probe.id}
                        onClick={() => void saveProbe(probe.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-rose-500/10 hover:text-rose-400"
                        onClick={() => void removeProbe(probe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={draft.text}
                    onChange={(event) => updateDraft(probe.id, { text: event.target.value })}
                    className="min-h-[72px]"
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add probe</p>
          <div className="flex flex-wrap items-start gap-2">
            <CategorySelect value={newCategory} onChange={setNewCategory} />
            <Textarea
              value={newText}
              onChange={(event) => setNewText(event.target.value)}
              className="min-h-[72px] min-w-[12rem] flex-1"
              placeholder="e.g. Best tools for AI search visibility?"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void addProbe()} disabled={adding || newText.trim().length === 0}>
              <Plus />
              Add probe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
