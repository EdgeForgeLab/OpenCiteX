import Link from "next/link";
import { ArrowRight, KeyRound, Radar, Rows3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { HeroCopy } from "@/components/landing/hero-copy";
import { HeroMonitor } from "@/components/landing/hero-monitor";

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
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">Launch visibility scan</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/settings">Paste BYOK keys</Link>
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
              body: "Perplexity, OpenAI, and Gemini keys are encrypted with AES-256-GCM in Postgres. The browser never reads them back; /api/run decrypts only for that request.",
            },
            {
              icon: Rows3,
              title: "Sequential queue",
              body: "Client-side job queue hits /api/run one engine at a time with backoff, so rate limits don't torch your first scan.",
            },
            {
              icon: Radar,
              title: "Citation hook",
              body: "Rows that aren't mentioned or cited get a Fix with Metacitex action — a conversion path when the radar finds a gap.",
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
