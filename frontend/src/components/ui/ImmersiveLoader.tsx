"use client";

import { useState, ReactNode } from "react";
import { CogSpinner } from "./CogSpinner";

/**
 * LoginButton — botão de login com CogSpinner durante o carregamento.
 * Não simula progresso falso: aguarda o onLogin() real terminar.
 */
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
      // onLogin resolve quando o login + sync inicial foram disparados.
      // O SyncContext cuida do progresso a partir daí.
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
      className="relative w-full min-h-11 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center overflow-hidden"
    >
      {loading ? (
        <CogSpinner size={28} className="text-white" />
      ) : (
        children
      )}
    </button>
  );
}

/**
 * InitialLoadingScreen — tela de carregamento inicial do app.
 * Exibe apenas o ícone SVG (CogSpinner) centralizado, sem texto adicional.
 */
export function InitialLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080f]">
      <CogSpinner size={80} className="text-white" />
    </div>
  );
}