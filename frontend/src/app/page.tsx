"use client";

import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center z-[100]">
        <div className="flex flex-col items-center gap-6">
          <CogSpinner size={80} className="text-white" />
          <p className="text-white/60 text-sm font-medium tracking-wide">IFNMG Assistente</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
