"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-[var(--duration-normal)] ease-[var(--ease-in-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] shadow-sm shadow-[var(--shadow-accent)]",
        destructive: "bg-[var(--status-urgent)] text-white hover:bg-[var(--status-urgent)]",
        outline: "border border-[var(--border-strong)] bg-[var(--surface-inset)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        secondary: "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        ghost: "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
        accent: "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--background)] shadow-lg shadow-[var(--shadow-accent)] hover:from-[var(--accent-hover)] hover:to-[var(--accent)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => <button className={className} ref={ref} {...props} />) : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };