"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ACTIVE_PROJECT_KEY, type ApiKeys } from "@/lib/types";
import { Eye, EyeOff, Shield } from "lucide-react";

type Project = {
  id: string;
  name: string;
  targetDomain: string;
  brandKeywords: string[];
  competitors: string[];
};

const EMPTY_PROJECT = {
  name: "MetaCitex",
  targetDomain: "metacitex.com",
  brandKeywords: "MetaCitex, GEO, AI citations",
  competitors: "Profound, Goodie AI, Peec AI",
};

export default function SettingsPage() {
  const { hints, saveKeys, hydrated, configured } = useApiKeys();
  const [draftKeys, setDraftKeys] = useState<ApiKeys>({
    perplexity: "",
    openai: "",
    gemini: "",
  });
  const [show, setShow] = useState<Record<keyof ApiKeys, boolean>>({
    perplexity: false,
    openai: false,
    gemini: false,
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/projects");
      const payload = (await response.json()) as { projects?: Project[] };
      const storedId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      const selected =
        payload.projects?.find((item) => item.id === storedId) ?? payload.projects?.[0];
      if (!selected) return;
      setProjectId(selected.id);
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, selected.id);
      setProject({
        name: selected.name,
        targetDomain: selected.targetDomain,
        brandKeywords: selected.brandKeywords.join(", "),
        competitors: selected.competitors.join(", "),
      });
    }
    void load();
  }, []);

  function splitList(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function persistKeys() {
    const patch: Partial<Record<keyof ApiKeys, string | null>> = {};
    (Object.keys(draftKeys) as (keyof ApiKeys)[]).forEach((field) => {
      if (draftKeys[field].trim()) patch[field] = draftKeys[field].trim();
    });
    if (Object.keys(patch).length === 0) {
      toast.error("Paste a new key to save, or leave fields blank to keep the stored ones.");
      return;
    }
    setSavingKeys(true);
    try {
      await saveKeys(patch);
      setDraftKeys({ perplexity: "", openai: "", gemini: "" });
      toast.success("API keys encrypted and saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save keys.");
    } finally {
      setSavingKeys(false);
    }
  }

  async function clearKey(field: keyof ApiKeys) {
    setSavingKeys(true);
    try {
      await saveKeys({ [field]: null });
      setDraftKeys((current) => ({ ...current, [field]: "" }));
      toast.success(`${field} key removed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove key.");
    } finally {
      setSavingKeys(false);
    }
  }

  async function persistProject() {
    setSavingProject(true);
    try {
      const body = {
        name: project.name,
        targetDomain: project.targetDomain,
        brandKeywords: splitList(project.brandKeywords),
        competitors: splitList(project.competitors),
        seedPrompts: !projectId,
      };
      const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { project?: Project; error?: string };
      if (!response.ok || !payload.project) {
        throw new Error(payload.error || "Could not save project.");
      }
      setProjectId(payload.project.id);
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, payload.project.id);
      toast.success(projectId ? "Project settings updated." : "Workspace created with starter prompts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingProject(false);
    }
  }

  return (
    <AppShell>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
      <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Bring your own keys. They are encrypted with AES-256-GCM and stored in Postgres — never returned to the browser. Sign in is required to save or use them.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              BYOK API keys
            </CardTitle>
            <CardDescription>
              Perplexity <code>sonar</code>, OpenAI <code>gpt-4o</code> / <code>gpt-4o-mini</code>, Gemini{" "}
              <code>gemini-3.6-flash</code>. Blank fields keep the key already on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["perplexity", "Perplexity API key"],
                ["openai", "OpenAI API key"],
                ["gemini", "Gemini API key"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={field}>{label}</Label>
                  {configured[field] && hints[field] ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      saved · ••••{hints[field]}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">not set</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id={field}
                    type={show[field] ? "text" : "password"}
                    autoComplete="off"
                    value={draftKeys[field]}
                    onChange={(event) =>
                      setDraftKeys((current) => ({ ...current, [field]: event.target.value }))
                    }
                    className="font-mono placeholder:font-mono"
                    placeholder={
                      configured[field] && hints[field]
                        ? `••••${hints[field]} — paste to replace`
                        : "sk-..."
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShow((current) => ({ ...current, [field]: !current[field] }))}
                  >
                    {show[field] ? <EyeOff /> : <Eye />}
                  </Button>
                  {configured[field] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void clearKey(field)}
                      disabled={savingKeys}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <Button onClick={() => void persistKeys()} disabled={!hydrated || savingKeys}>
              Save keys
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project settings</CardTitle>
            <CardDescription>
              Brand, domain, and competitors used when scoring mentions and intercepts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand name</Label>
              <Input
                id="brand"
                value={project.name}
                onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Target domain</Label>
              <Input
                id="domain"
                value={project.targetDomain}
                onChange={(event) =>
                  setProject((current) => ({ ...current, targetDomain: event.target.value }))
                }
                className="font-mono placeholder:font-mono"
                placeholder="metacitex.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Brand keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={project.brandKeywords}
                onChange={(event) =>
                  setProject((current) => ({ ...current, brandKeywords: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitors">Competitors (comma-separated)</Label>
              <Input
                id="competitors"
                value={project.competitors}
                onChange={(event) =>
                  setProject((current) => ({ ...current, competitors: event.target.value }))
                }
              />
            </div>
            <Button onClick={() => void persistProject()} disabled={savingProject}>
              {projectId ? "Update project" : "Create workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
