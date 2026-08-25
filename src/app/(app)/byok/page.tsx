"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ProviderIdentity, ProviderLogo } from "@/components/providers/provider-logo";
import {
  ANALYZER_MODELS,
  ENGINE_META,
  MAX_PACE_SEC,
  MIN_PACE_SEC,
  PROVIDER_IDS,
  type ProviderId,
} from "@/lib/types";

export default function ByokPage() {
  const { hints, paceMs, analyzer, saveKeys, savePace, saveAnalyzer, hydrated, configured } =
    useApiKeys();
  const [editing, setEditing] = useState<ProviderId | null>(null);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paceDraft, setPaceDraft] = useState<Partial<Record<ProviderId, string>>>({});
  const [paceSaving, setPaceSaving] = useState<ProviderId | null>(null);
  const [paceSaved, setPaceSaved] = useState<ProviderId | null>(null);
  const [clearing, setClearing] = useState<ProviderId | null>(null);
  const readyIds = PROVIDER_IDS.filter((id) => configured[id]);
  const analyzerValue = analyzer && configured[analyzer] ? analyzer : "none";

  function openSet(id: ProviderId) {
    setEditing(id);
    setDraft("");
    setShow(false);
  }

  async function persist() {
    if (!editing) return;
    const value = draft.trim();
    if (!value) {
      toast.error("Paste an API key first.");
      return;
    }
    setSaving(true);
    try {
      await saveKeys({ [editing]: value });
      toast.success(`${ENGINE_META[editing].label} key saved.`);
      setEditing(null);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save key.");
    } finally {
      setSaving(false);
    }
  }

  async function clearKey() {
    if (!clearing) return;
    setSaving(true);
    try {
      await saveKeys({ [clearing]: null });
      toast.success(`${ENGINE_META[clearing].label} key removed.`);
      setClearing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove key.");
    } finally {
      setSaving(false);
    }
  }

  function paceDisplay(id: ProviderId) {
    if (paceDraft[id] != null) return paceDraft[id];
    return String(paceMs[id] / 1000);
  }

  async function commitPace(id: ProviderId) {
    const raw = paceDraft[id];
    if (raw == null) return;
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < MIN_PACE_SEC || seconds > MAX_PACE_SEC) {
      toast.error(`Interval must be ${MIN_PACE_SEC}–${MAX_PACE_SEC} seconds.`);
      setPaceDraft((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const ms = Math.round(seconds * 1000);
    if (ms === paceMs[id]) {
      setPaceDraft((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setPaceSaving(id);
    try {
      await savePace({ [id]: ms });
      setPaceDraft((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setPaceSaved(id);
      toast.success(`${ENGINE_META[id].label} interval saved.`);
      window.setTimeout(() => {
        setPaceSaved((current) => (current === id ? null : current));
      }, 1600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save interval.");
    } finally {
      setPaceSaving(null);
    }
  }

  const editingMeta = editing ? ENGINE_META[editing] : null;
  const clearingMeta = clearing ? ENGINE_META[clearing] : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
        <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Keys are encrypted with AES-256-GCM in Postgres and never sent back to the browser. They
          are shared across all brands. Set a per-provider call interval to stay under rate limits.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            Analysis model
            <InfoTip label="About the analysis model">
              After a scan, if string matching does not find the brand, this model reads the answer
              and can mark a mention. Citations still come from URLs. Prefer a cheap chat model such
              as DeepSeek or Qwen. Leave as Rules only to skip the extra call.
            </InfoTip>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Used only when the answer does not already name the brand.
          </p>
        </div>
        <Select
          value={analyzerValue}
          onValueChange={(value) => {
            void (async () => {
              try {
                await saveAnalyzer(value === "none" ? null : (value as ProviderId));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save analysis model.");
              }
            })();
          }}
          disabled={!hydrated || readyIds.length === 0}
        >
          <SelectTrigger className="h-9 w-full sm:w-[16rem]">
            <SelectValue placeholder="Rules only" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Rules only</SelectItem>
            {readyIds.map((id) => (
              <SelectItem key={id} value={id}>
                {ENGINE_META[id].label} · {ANALYZER_MODELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-[16rem]">
                <span className="inline-flex items-center gap-1.5">
                  Interval
                  <InfoTip label="About call interval">
                    Seconds to wait after a call to this provider before calling it again during a
                    scan. Other providers are not delayed by this value.
                  </InfoTip>
                </span>
              </TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!hydrated
              ? Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : PROVIDER_IDS.map((id) => {
                  const meta = ENGINE_META[id];
                  const ready = configured[id];
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <ProviderIdentity
                          id={id}
                          subtitle={
                            <a
                              href={meta.docs}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
                            >
                              Get an API key
                            </a>
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {meta.model}
                      </TableCell>
                      <TableCell className="w-[16rem]">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={MIN_PACE_SEC}
                            max={MAX_PACE_SEC}
                            step={0.5}
                            value={paceDisplay(id)}
                            disabled={paceSaving === id}
                            onChange={(event) =>
                              setPaceDraft((current) => ({ ...current, [id]: event.target.value }))
                            }
                            onBlur={() => void commitPace(id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-8 w-[4.5rem] font-mono text-xs"
                          />
                          <span className="text-xs text-muted-foreground">s</span>
                          <span className="inline-flex min-w-[3.75rem] items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                            {paceSaving === id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : paceSaved === id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Saved
                              </>
                            ) : null}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap">
                        {ready ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="cited" className="font-mono">
                              saved · ••••{hints[id]}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={saving}
                                  aria-label={`Clear ${meta.label} key`}
                                  onClick={() => setClearing(id)}
                                  className="h-6 w-6 text-destructive hover:translate-y-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Clear key</TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openSet(id)}>
                          <KeyRound />
                          {ready ? "Replace" : "Set key"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(clearing)}
        onOpenChange={(open) => {
          if (!open && !saving) setClearing(null);
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
            <DialogTitle className="flex items-center gap-2">
              {clearing ? <ProviderLogo id={clearing} className="h-5 w-5" /> : null}
              {clearingMeta ? `Clear ${clearingMeta.label} key?` : "Clear key?"}
            </DialogTitle>
            <DialogDescription>
              {clearingMeta
                ? `This removes the encrypted ${clearingMeta.label} key from the workspace. Scans for this provider will stop until you set a new key.`
                : "This removes the encrypted key from the workspace."}
              {clearing && analyzer === clearing
                ? " It is also the analysis model, which will reset to Rules only."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setClearing(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={() => void clearKey()}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? "Clearing…" : "Clear key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setDraft("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <ProviderLogo id={editing} className="h-5 w-5" /> : null}
              {editingMeta ? `Set ${editingMeta.label} key` : "Set key"}
            </DialogTitle>
            <DialogDescription>
              {editingMeta
                ? `Used for ${editingMeta.label} ${editingMeta.model} scans. The key is encrypted at rest.`
                : "The key is encrypted at rest."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="api-key">API key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={show ? "text" : "password"}
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="font-mono"
                placeholder={editingMeta?.placeholder ?? "sk-..."}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShow((current) => !current)}
              >
                {show ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => void persist()} disabled={saving || !draft.trim()}>
                Save key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
  );
}
