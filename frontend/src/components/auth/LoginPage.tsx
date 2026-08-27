"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, Loader2, ShieldCheck, Lock, User, ExternalLink } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(
        err.message ||
        "Não foi possível conectar ao Virtual2. Verifique seu usuário e senha do IFNMG."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/30 via-[#0f0f13] to-purple-950/20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl mb-4 shadow-xl shadow-indigo-600/30">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">IFNMG Assistente</h1>
          <p className="text-gray-400 text-xs mt-1">
            Seu tutor de IA integrado ao <strong className="text-indigo-400 font-semibold">Virtual2</strong>
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#181826] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" /> Acesso com Virtual2
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Entre diretamente com suas credenciais do portal do IFNMG.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Usuário / CPF / Matrícula
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: 14973814684"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <User className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Senha do Virtual2
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 text-red-400 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Conectando ao Virtual2...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Criptografia AES-128
            </span>
            <a
              href="https://virtual2.ifnmg.edu.br"
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-400 transition flex items-center gap-1"
            >
              virtual2.ifnmg.edu.br <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-5">
          IFNMG Assistente — Plataforma independente para estudantes.
        </p>
      </div>
    </div>
  );
}
