"use client";

import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--background)] flex flex-col items-center justify-center z-[100]">
        <CogSpinner size={40} className="text-emerald-400/60" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
