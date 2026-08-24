import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        cited: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        mentioned: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        prompted: "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:text-slate-300",
        hidden: "border-rose-500/20 bg-rose-500/10 text-rose-400",
        brand: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        category: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        competitor: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        scenario: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
