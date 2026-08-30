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
    // Detecta se é dispositivo mobile (largura de tela ou touch)
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth <= 768 ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0);

    // No celular aguarda pelo menos 1.2s para exibir a animação completa
    const delay = isMobile ? 1200 : 0;

    const timer = setTimeout(() => {
      setMinDelayPassed(true);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // Mostra a tela de carregamento enquanto o Auth estiver carregando
  // OU enquanto o delay mínimo de 1s para celular não tiver passado
  if (loading || !minDelayPassed) {
    return (
      <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center z-[100] transition-opacity duration-300">
        <CogSpinner size={80} className="text-white" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Dashboard />;
}
