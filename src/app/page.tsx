import Link from "next/link";
import { ArrowRight, BookOpen, Github, KeyRound, Radar, Rows3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { Button } from "@/components/ui/button";
import { HeroCopy } from "@/components/landing/hero-copy";
import { HeroMonitor } from "@/components/landing/hero-monitor";
import { ENGINE_META, PROVIDER_IDS } from "@/lib/types";

const DOCS_URL = "https://github.com/edgeforgelab/OpenCiteX#readme";
const GITHUB_URL = "https://github.com/edgeforgelab/OpenCiteX";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 sonar-grid" />
      <div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
            <Radar className="h-4 w-4" />
          </span>
          <span className="font-sans text-2xl font-semibold tracking-tight">OpenCiteX</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="mr-1 hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="sm" asChild>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                <BookOpen />
                Docs
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github />
                GitHub
              </a>
            </Button>
          </nav>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
            aria-label="Docs"
          >
            <BookOpen className="h-4 w-4" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <Button asChild>
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <HeroCopy />
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {PROVIDER_IDS.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                    <ProviderLogo id={id} className="h-4 w-4" />
                  </span>
                  {ENGINE_META[id].label}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">Launch visibility scan</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/byok">Paste BYOK keys</Link>
              </Button>
            </div>
          </div>
          <HeroMonitor />
        </section>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: KeyRound,
              title: "BYOK, encrypted at rest",
              body: "Perplexity, OpenAI, Gemini, DeepSeek, and Qwen keys are encrypted with AES-256-GCM in Postgres. The browser never reads them back; /api/run decrypts only for that request.",
            },
            {
              icon: Rows3,
              title: "Sequential queue",
              body: "Client-side job queue hits /api/run one engine at a time with backoff, so rate limits don't torch your first scan.",
            },
            {
              icon: Radar,
              title: "Unprompted scoring",
              body: "Mention and citation rates only count probes that do not name your brand, so repeating the question does not inflate visibility.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="mt-4 font-sans text-2xl font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
