import type { ReactNode } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 sonar-grid" />
      <header className="relative mx-auto flex max-w-lg items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
            <Radar className="h-4 w-4" />
          </span>
          <span className="font-sans text-xl font-semibold tracking-tight">OpenCiteX</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-full max-w-lg px-6 pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace access</p>
        <h1 className="mt-1 font-sans text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-8 rounded-xl border border-border bg-card p-6">{children}</div>
      </main>
    </div>
  );
}
