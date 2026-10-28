"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentProps<typeof TooltipPrimitive.Content>
>(({ className, sideOffset, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset ?? 8}
    className={cn(
      "z-[1000] overflow-hidden rounded-lg border border-white/10 bg-ink-750/95 px-2.5 py-1.5 text-[10px] font-medium text-zinc-200 shadow-xl shadow-black/50 backdrop-blur-xl",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
