import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)] text-[var(--background)]",
        secondary:
          "border-transparent bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-[var(--status-urgent)] text-white",
        outline: "text-[var(--text-secondary)]",
        accent:
          "border-transparent bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--background)] shadow-sm",
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