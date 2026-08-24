"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
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
import { ACTIVE_PROJECT_KEY, CATEGORY_META } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@prisma/client";

type PromptRow = {
  id: string;
  text: string;
  category: PromptCategory;
  _count?: { results: number };
};

export default function PromptsPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<PromptCategory>("brand");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prompts?projectId=${id}`);
      const payload = (await response.json()) as { prompts?: PromptRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load prompts.");
      setPrompts(payload.prompts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load prompts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function boot() {
      const response = await fetch("/api/projects");
      const payload = (await response.json()) as { projects?: { id: string }[] };
      const storedId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      const selected =
        payload.projects?.find((item) => item.id === storedId) ?? payload.projects?.[0];
      if (!selected) {
        setLoading(false);
        return;
      }
      setProjectId(selected.id);
      await load(selected.id);
    }
    void boot();
  }, [load]);

  function resetForm() {
    setText("");
    setCategory("brand");
  }

  async function addPrompt() {
    if (!projectId) {
      toast.error("Create a project in Settings first.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, text, category }),
      });
      const payload = (await response.json()) as { prompt?: PromptRow; error?: string };
      if (!response.ok || !payload.prompt) throw new Error(payload.error || "Could not add prompt.");
      setPrompts((current) => [payload.prompt!, ...current]);
      resetForm();
      setDialogOpen(false);
      toast.success("Prompt added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removePrompt(id: string) {
    try {
      const response = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Delete failed.");
      }
      setPrompts((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function seedDefaults() {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/seed`, { method: "POST" });
      const payload = (await response.json()) as {
        prompts?: PromptRow[];
        added?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Seed failed.");
      setPrompts(payload.prompts ?? []);
      toast.success(`Added ${payload.added ?? 0} starter prompts.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Seed failed.");
    }
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Probe set</p>
          <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Prompts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Brand, category, competitor, and scenario queries sent sequentially to each engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void seedDefaults()} disabled={!projectId}>
            Seed starter prompts
          </Button>
          <Button onClick={() => setDialogOpen(true)} disabled={!projectId}>
            <Plus />
            Add prompt
          </Button>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add prompt</DialogTitle>
            <DialogDescription>
              New queries are queued with the rest of the probe set on the next scan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div
                className="grid grid-cols-2 rounded-lg border border-border bg-card p-0.5 sm:flex sm:items-center"
                role="group"
                aria-label="Prompt category"
              >
                {(Object.keys(CATEGORY_META) as PromptCategory[]).map((value) => {
                  const meta = CATEGORY_META[value];
                  const selected = category === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      className={cn(
                        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all duration-200 sm:flex-1",
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          selected ? "bg-primary-foreground" : meta.dotClass,
                        )}
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt text</Label>
              <Textarea
                id="prompt"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="What are the best GEO platforms in 2026?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void addPrompt()} disabled={saving || text.trim().length < 8}>
                <Plus />
                Add prompt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-2 rounded-xl border border-border p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No prompts yet. Create a workspace in Settings, then seed or add queries here.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px]">Prompt</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="max-w-2xl leading-relaxed">{prompt.text}</TableCell>
                  <TableCell>
                    <Badge variant={prompt.category}>
                      {CATEGORY_META[prompt.category].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {prompt._count?.results ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => void removePrompt(prompt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
