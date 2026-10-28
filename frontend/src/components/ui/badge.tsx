import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-ink-950",
        secondary:
          "border-white/10 bg-white/[0.05] text-zinc-300",
        destructive:
          "border-transparent bg-status-urgent text-white",
        outline: "border-white/10 text-zinc-300",
        accent:
          "border-accent/25 bg-accent/[0.09] text-accent-light",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
