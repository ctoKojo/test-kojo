// Kojobot — Branded button variants
// Wraps shadcn Button styling with Kojo design system variants.
// Per /DESIGN_SYSTEM.md §5.1:
//   - primary: cyan→violet gradient + shadow-gradient
//   - secondary: outline cyan
//   - danger: outline red
//   - ghost: transparent + cyan hover

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const kojoButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-main font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kojo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-kojo-gradient text-white shadow-kojo-gradient hover:-translate-y-px hover:opacity-90 active:translate-y-0 active:opacity-80",
        secondary:
          "border border-kojo-cyan text-kojo-cyan bg-transparent hover:bg-kojo-cyan/10",
        danger:
          "border border-destructive text-destructive bg-transparent hover:bg-destructive/10",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-kojo-cyan/10 hover:text-kojo-cyan",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-4",
        md: "h-10 px-6 text-sm [&_svg]:size-4",
        lg: "h-12 px-8 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface KojoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof kojoButtonVariants> {
  asChild?: boolean;
}

export const KojoButton = React.forwardRef<HTMLButtonElement, KojoButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(kojoButtonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
KojoButton.displayName = "KojoButton";

export { kojoButtonVariants };
