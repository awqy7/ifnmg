"use client";

import { GraduationCap } from "lucide-react";
import { Glass } from "glisse";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
        <Glass className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border border-white/15 bg-ink-950/80 shadow-2xl backdrop-blur-2xl animate-pulse-subtle max-w-xs w-full text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-ink-950 shadow-[0_0_25px_rgba(185,232,106,0.4)]">
            <GraduationCap className="h-7 w-7" strokeWidth={2.4} />
          </span>
          <div>
            <p className="font-display text-base font-extrabold tracking-tight text-white">IFNMG</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
              Assistente Acadêmico
            </p>
          </div>
          <CogSpinner size={24} className="mt-2 text-emerald-400" />
        </Glass>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
