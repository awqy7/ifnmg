"use client";

import { useState, ReactNode } from "react";
import { CogSpinner } from "./CogSpinner";

export function LoginButton({
  onLogin,
  children,
  onError,
}: {
  onLogin: () => Promise<void>;
  children: ReactNode;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onLogin();
    } catch (error: any) {
      onError?.(error.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="relative w-full min-h-11 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-semibold text-white text-sm tracking-wide"
    >
      {loading ? <CogSpinner size={22} className="text-white" /> : children}
    </button>
  );
}

export function InitialLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]">
      <CogSpinner size={40} className="text-emerald-400/60" />
    </div>
  );
}
