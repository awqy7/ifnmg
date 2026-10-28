"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-ink-950 shadow-glow-sm hover:bg-accent-soft hover:shadow-glow",
        accent:
          "bg-accent-gradient text-ink-950 shadow-glow-sm hover:brightness-110 hover:shadow-glow",
        destructive:
          "bg-status-urgent/90 text-white hover:bg-status-urgent shadow-[0_12px_32px_-16px_rgba(255,95,109,0.7)]",
        outline:
          "border border-white/10 bg-white/[0.035] text-zinc-200 hover:border-accent/35 hover:bg-accent/[0.07] hover:text-white",
        secondary:
          "bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1] hover:text-white",
        ghost:
          "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-sm",
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

const ForwardButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
  return <button className={className} ref={ref} {...props} />;
});
ForwardButton.displayName = "ForwardButton";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? ForwardButton : "button";
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
