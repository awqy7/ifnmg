"use client";

import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando IFNMG Assistente...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
