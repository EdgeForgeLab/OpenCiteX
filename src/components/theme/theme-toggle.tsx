"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border bg-card p-0.5",
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-200",
          theme === "dark"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-200",
          theme === "light"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
    </div>
  );
}
