// Kojobot — Branded badge variants
// Per /DESIGN_SYSTEM.md §5.4 — semantic + package tier badges.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const kojoBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium font-main",
  {
    variants: {
      variant: {
        success: "bg-success/15 text-success border-success/30",
        danger: "bg-destructive/15 text-destructive border-destructive/30",
        warning: "bg-warning/15 text-warning border-warning/30",
        info: "bg-kojo-cyan/10 text-kojo-cyan border-kojo-cyan/20",
        squad: "bg-kojo-cyan/15 text-kojo-cyan border-kojo-cyan/30",
        core: "bg-kojo-violet/15 text-kojo-violet border-kojo-violet/30",
        x: "bg-kojo-gradient text-white border-transparent shadow-kojo-gradient",
        neutral: "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface KojoBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof kojoBadgeVariants> {}

export const KojoBadge = React.forwardRef<HTMLSpanElement, KojoBadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(kojoBadgeVariants({ variant, className }))}
      {...props}
    />
  ),
);
KojoBadge.displayName = "KojoBadge";
