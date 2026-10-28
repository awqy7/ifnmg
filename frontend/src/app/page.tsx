"use client";

import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-backdrop fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow-sm">
          <GraduationCap className="h-6 w-6 text-ink-950" strokeWidth={2.4} />
        </span>
        <div className="text-center">
          <p className="font-display text-sm font-bold tracking-tight text-white">IFNMG</p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-accent/70">
            Assistente acadêmico
          </p>
        </div>
        <CogSpinner size={22} className="mt-1 text-accent/70" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
