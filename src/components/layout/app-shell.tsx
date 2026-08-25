"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyRound,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Radar,
  ScrollText,
  MessageSquare,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
};

const NAV_GROUPS: { id: string; label: string | null; items: NavItem[] }[] = [
  {
    id: "default",
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "audit",
    label: "Job",
    items: [
      { href: "/scans", label: "Scan", icon: ListTodo },
      { href: "/results", label: "Results", icon: ScrollText },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { href: "/brands", label: "Brands", icon: Tags },
      { href: "/prompts", label: "Prompts", icon: MessageSquare },
      { href: "/byok", label: "API Keys", icon: KeyRound, hint: "BYOK" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  className,
}: {
  item: NavItem;
  pathname: string;
  className?: string;
}) {
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 [&_svg]:transition-transform [&_svg]:duration-200",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-foreground hover:[&_svg]:scale-110",
        className,
      )}
    >
      <item.icon className="h-4 w-4" />
      <span className="flex min-w-0 items-baseline gap-1.5">
        {item.label}
        {item.hint ? (
          <span className="text-[10px] font-normal text-muted-foreground/60">{item.hint}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 sonar-grid opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background/90 px-4 py-6 backdrop-blur md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
              <Radar className="h-4 w-4" />
            </span>
            <span className="font-sans text-xl font-semibold tracking-tight">OpenCiteX</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                {group.label ? (
                  <p className="px-3 pb-0.5 text-[9px] font-normal uppercase tracking-[0.18em] text-muted-foreground/50">
                    {group.label}
                  </p>
                ) : null}
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-auto space-y-3 px-1">
            <ThemeToggle className="w-full justify-center" />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
              BYOK GEO radar. Keys are encrypted in Postgres and never sent back to the browser.
            </p>
            <p className="px-2 text-[11px] text-muted-foreground">
              Powered by{" "}
              <a
                href="https://www.metacitex.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                MetaCiteX
              </a>
            </p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border md:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href="/" className="font-sans text-lg font-semibold tracking-tight">
                OpenCiteX
              </Link>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            </div>
            <nav className="flex items-start gap-6 overflow-x-auto px-4 pb-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="flex flex-col gap-1">
                  {group.label ? (
                    <p className="text-[9px] font-normal uppercase tracking-[0.18em] text-muted-foreground/50">
                      {group.label}
                    </p>
                  ) : (
                    <span className="h-3" />
                  )}
                  <div className="flex gap-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        className="px-2 py-1.5"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          <p className="px-4 pb-4 text-[11px] text-muted-foreground md:hidden">
            Powered by{" "}
            <a
              href="https://www.metacitex.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              MetaCiteX
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
