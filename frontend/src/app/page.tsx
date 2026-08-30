"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/dashboard/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function Home() {
  const { user, loading } = useAuth();
  const [minDelayPassed, setMinDelayPassed] = useState(false);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth <= 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0);

    const delay = isMobile ? 800 : 0;
    const timer = setTimeout(() => setMinDelayPassed(true), delay);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minDelayPassed) {
    return (
      <div className="fixed inset-0 bg-[var(--background)] flex flex-col items-center justify-center z-[100]">
        <CogSpinner size={40} className="text-emerald-400/60" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
