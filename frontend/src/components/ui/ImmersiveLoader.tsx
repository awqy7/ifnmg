"use client";

import { GraduationCap } from "lucide-react";
import { CogSpinner } from "./CogSpinner";

export function InitialLoadingScreen() {
  return (
    <div className="app-backdrop fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow-sm">
        <GraduationCap className="h-6 w-6 text-ink-950" strokeWidth={2.4} />
      </span>
      <CogSpinner size={22} className="text-accent/70" />
    </div>
  );
}
