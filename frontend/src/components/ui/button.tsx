"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-normal transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-emerald-400 to-emerald-500 text-ink-950 font-semibold shadow-[0_4px_16px_rgba(69,255,156,0.3)] hover:brightness-110",
        accent:
          "bg-gradient-to-r from-emerald-400 to-emerald-500 text-ink-950 font-semibold shadow-[0_4px_16px_rgba(69,255,156,0.3)] hover:brightness-110",
        destructive:
          "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_4px_16px_rgba(244,63,94,0.3)] hover:brightness-110",
        outline:
          "border border-white/15 bg-white/[0.04] backdrop-blur-md text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-white/[0.08] hover:border-white/25 hover:text-white",
        secondary:
          "bg-white/[0.07] backdrop-blur-md text-zinc-200 border border-white/10 hover:bg-white/[0.12] hover:text-white",
        glass:
          "bg-white/[0.08] backdrop-blur-xl border border-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-white/[0.14] hover:border-white/25",
        ghost:
          "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-lg",
        lg: "h-11 px-5 text-sm rounded-xl",
        icon: "h-9 w-9 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
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
