"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProviderLogo } from "@/components/providers/provider-logo";
import type { ResultRow } from "@/lib/metrics";
import { CATEGORY_META, ENGINE_META } from "@/lib/types";
import { cn, domainMatches, hostnameFromUrl, unique } from "@/lib/utils";

type OutputMode = "markdown" | "preview";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function citationIsOfficial(citation: string, targetDomain: string) {
  const host = hostnameFromUrl(citation);
  return Boolean(host && targetDomain && domainMatches(host, targetDomain));
}

function citationsReferToSame(value: string, citation: string) {
  if (value === citation) return true;
  const left = hostnameFromUrl(value);
  const right = hostnameFromUrl(citation);
  if (!left || !right) {
    return value.toLowerCase().includes(citation.toLowerCase()) || citation.toLowerCase().includes(value.toLowerCase());
  }
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

type RawMark = { start: number; end: number; official: boolean };

function collectCitationMarks(text: string, citations: string[], targetDomain: string): RawMark[] {
  if (!text || citations.length === 0) return [];
  const marks: RawMark[] = [];

  const urlRe = /https?:\/\/[^\s"'<>)]+/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text))) {
    const url = match[0].replace(/[.,;]+$/, "");
    const citation = citations.find((item) => citationsReferToSame(url, item));
    if (!citation) continue;
    marks.push({
      start: match.index,
      end: match.index + url.length,
      official: citationIsOfficial(citation, targetDomain),
    });
  }

  for (const citation of citations) {
    const host = hostnameFromUrl(citation);
    const needles = unique([citation, host].filter((item): item is string => Boolean(item && item.length >= 3)));
    for (const needle of needles) {
      const pattern = /^https?:\/\//i.test(needle)
        ? new RegExp(escapeRegExp(needle), "gi")
        : new RegExp(`(?<![a-z0-9.-])${escapeRegExp(needle)}(?![a-z0-9.-])`, "gi");
      while ((match = pattern.exec(text))) {
        marks.push({
          start: match.index,
          end: match.index + match[0].length,
          official: citationIsOfficial(citation, targetDomain),
        });
      }
    }
  }

  citations.forEach((citation, index) => {
    const pattern = new RegExp(`\\[${index + 1}\\]`, "g");
    while ((match = pattern.exec(text))) {
      marks.push({
        start: match.index,
        end: match.index + match[0].length,
        official: citationIsOfficial(citation, targetDomain),
      });
    }
  });

  marks.sort((a, b) => a.start - b.start || b.end - a.end || Number(b.official) - Number(a.official));
  const merged: RawMark[] = [];
  for (const mark of marks) {
    const last = merged[merged.length - 1];
    if (last && mark.start < last.end) continue;
    merged.push(mark);
  }
  return merged;
}

function renderHighlightedRaw(text: string, citations: string[], targetDomain: string): ReactNode {
  const marks = collectCitationMarks(text, citations, targetDomain);
  if (marks.length === 0) return text;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [index, mark] of marks.entries()) {
    if (mark.start > cursor) nodes.push(text.slice(cursor, mark.start));
    nodes.push(
      <mark
        key={`${mark.start}-${index}`}
        className={cn(
          "rounded-sm px-0.5 text-inherit",
          mark.official ? "bg-emerald-500/30 dark:bg-emerald-400/25" : "bg-sky-500/25 dark:bg-sky-400/20",
        )}
      >
        {text.slice(mark.start, mark.end)}
      </mark>,
    );
    cursor = mark.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function highlightTree(node: ReactNode, citations: string[], targetDomain: string): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    return renderHighlightedRaw(String(node), citations, targetDomain);
  }
  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={index}>{highlightTree(child, citations, targetDomain)}</Fragment>
    ));
  }
  return node;
}

function citationHref(citation: string) {
  if (/^https?:\/\//i.test(citation)) return citation;
  const host = hostnameFromUrl(citation);
  return host ? `https://${host}` : null;
}

function ModeToggle({ value, onChange }: { value: OutputMode; onChange: (mode: OutputMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {(["markdown", "preview"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === mode ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode === "markdown" ? "Markdown" : "Preview"}
        </button>
      ))}
    </div>
  );
}

function MarkdownPreview({
  text,
  citations,
  targetDomain,
}: {
  text: string;
  citations: string[];
  targetDomain: string;
}) {
  return (
    <div className="md-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const citation = href ? citations.find((item) => citationsReferToSame(href, item)) : undefined;
            const official = citation ? citationIsOfficial(citation, targetDomain) : false;
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  official && "rounded-sm bg-emerald-500/30",
                  citation && !official && "rounded-sm bg-sky-500/25",
                )}
              >
                {children}
              </a>
            );
          },
          p({ children }) {
            return <p>{highlightTree(children, citations, targetDomain)}</p>;
          },
          li({ children }) {
            return <li>{highlightTree(children, citations, targetDomain)}</li>;
          },
          td({ children }) {
            return <td>{highlightTree(children, citations, targetDomain)}</td>;
          },
          th({ children }) {
            return <th>{highlightTree(children, citations, targetDomain)}</th>;
          },
          h1({ children }) {
            return <h1>{highlightTree(children, citations, targetDomain)}</h1>;
          },
          h2({ children }) {
            return <h2>{highlightTree(children, citations, targetDomain)}</h2>;
          },
          h3({ children }) {
            return <h3>{highlightTree(children, citations, targetDomain)}</h3>;
          },
          h4({ children }) {
            return <h4>{highlightTree(children, citations, targetDomain)}</h4>;
          },
          blockquote({ children }) {
            return <blockquote>{highlightTree(children, citations, targetDomain)}</blockquote>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function RawOutputDialog({ row }: { row: ResultRow }) {
  const [mode, setMode] = useState<OutputMode>("preview");
  const categoryMeta = CATEGORY_META[row.category as keyof typeof CATEGORY_META];
  const targetDomain = row.targetDomain ?? "";
  const officialCount = row.citations.filter((citation) => citationIsOfficial(citation, targetDomain)).length;
  const inTextHighlights = collectCitationMarks(row.rawText, row.citations, targetDomain).length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Raw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ProviderLogo id={row.engine} className="h-4 w-4" />
            Engine output
          </DialogTitle>
          <DialogDescription>
            {ENGINE_META[row.engine].label} · {row.citations.length} citation
            {row.citations.length === 1 ? "" : "s"}
            {officialCount > 0 ? " · includes official domain" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant={row.category as keyof typeof CATEGORY_META}
              className="px-2 py-0 text-[10px] font-medium"
            >
              {categoryMeta?.label ?? row.category}
            </Badge>
            {row.rankPosition > 0 ? (
              <span className="font-mono text-[11px] text-muted-foreground">#{row.rankPosition}</span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{row.promptText}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Response</p>
          <ModeToggle value={mode} onChange={setMode} />
        </div>

        {mode === "markdown" ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
            {row.citations.length > 0
              ? renderHighlightedRaw(row.rawText, row.citations, targetDomain)
              : row.rawText}
          </pre>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg bg-muted p-4">
            <MarkdownPreview text={row.rawText} citations={row.citations} targetDomain={targetDomain} />
          </div>
        )}

        {row.citations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Stored citations
              {officialCount > 0 ? " · green = official domain" : ""}
              {inTextHighlights ? " · matches in the response are highlighted" : ""}
            </p>
            <ol className="space-y-1.5">
              {row.citations.map((citation, index) => {
                const official = citationIsOfficial(citation, targetDomain);
                const href = citationHref(citation);
                return (
                  <li key={`${citation}-${index}`} className="flex items-start gap-2 font-mono text-xs">
                    <span className="mt-0.5 shrink-0 text-muted-foreground">{index + 1}.</span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex min-w-0 items-start gap-1 break-all underline-offset-2 hover:underline",
                          official ? "text-emerald-600 dark:text-emerald-400" : "text-sky-700 dark:text-sky-300",
                        )}
                      >
                        <span>{citation}</span>
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className={official ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                        {citation}
                      </span>
                    )}
                    {official ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                        Official
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
