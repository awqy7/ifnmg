"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, ShieldCheck, Lock, User, ExternalLink } from "lucide-react";
import { LoginButton } from "@/components/ui/ImmersiveLoader";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await login(username, password);
    } catch (err: any) {
      throw new Error(
        err.message ||
        "Não foi possível conectar ao Virtual2. Verifique seu usuário e senha do IFNMG."
      );
    }
  };

  const handleError = (msg: string) => {
    setError(msg);
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

          <form className="space-y-4">
            <div>
              <label htmlFor="moodle-username" className="block text-xs font-semibold text-gray-300 mb-1.5">
                Usuário / CPF / Matrícula
              </label>
              <div className="relative">
                <input
                  id="moodle-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <User className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="moodle-password" className="block text-xs font-semibold text-gray-300 mb-1.5">
                Senha do Virtual2
              </label>
              <div className="relative">
                <input
                  id="moodle-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
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

            <LoginButton onLogin={handleLogin} onError={handleError}>
              Entrar no Sistema
            </LoginButton>
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

        {/* Footer: crédito + privacidade */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] text-gray-600">
            IFNMG Assistente — Plataforma independente para estudantes.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span>Desenvolvido e criado por</span>
            <a
              href="https://instagram.com/vinicius.tsx"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
            >
              @vinicius.tsx
            </a>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed max-w-xs">
            🔒 Nosso sistema segue todas as diretrizes de privacidade —{" "}
            <span className="text-gray-500">não armazenamos nenhum dado seu.</span>
          </p>
        </div>
      </div>
    </div>
  );
}