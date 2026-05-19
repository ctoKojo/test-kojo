// Kojobot — Branded card variants
// Per /DESIGN_SYSTEM.md §5.2:
//   - default: bg-card + border + hover glow
//   - gradient: cyan→violet gradient
//   - stat: left border accent (cyan or violet)

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const kojoCardVariants = cva(
  "rounded-lg p-6 transition-all duration-250",
  {
    variants: {
      variant: {
        default:
          "bg-card border border-border shadow-md hover:border-kojo-cyan/30 hover:shadow-kojo-glow",
        gradient:
          "bg-kojo-gradient text-white rounded-xl p-8 shadow-kojo-gradient",
        stat: "bg-card border-l-[3px] p-6",
      },
      accent: {
        cyan: "border-l-kojo-cyan",
        violet: "border-l-kojo-violet",
        success: "border-l-success",
        warning: "border-l-warning",
        danger: "border-l-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface KojoCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kojoCardVariants> {}

export const KojoCard = React.forwardRef<HTMLDivElement, KojoCardProps>(
  ({ className, variant, accent, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(kojoCardVariants({ variant, accent, className }))}
      {...props}
    />
  ),
);
KojoCard.displayName = "KojoCard";
