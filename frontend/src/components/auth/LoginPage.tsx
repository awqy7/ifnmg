"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, ShieldCheck, Lock, User, ExternalLink, Sparkles } from "lucide-react";
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
        "Não foi possível autenticar no Virtual2. Confira seu usuário e senha institucionais."
      );
    }
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/20 via-[#08080c] to-zinc-950/40 pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl mb-4 shadow-xl shadow-emerald-950/50 border border-emerald-400/20">
            <GraduationCap className="w-9 h-9 text-white drop-shadow" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">IFNMG Assistente</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 font-normal">
            Inteligência acadêmica e estratégia de estudo conectadas ao <strong className="text-emerald-400 font-semibold">Virtual2</strong>
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Acesso Seguro Institucional
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Entre com suas credenciais do portal IFNMG e acesse instantaneamente seus prazos, matérias e plano de estudo.
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="moodle-username" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Usuário / CPF / Matrícula
              </label>
              <div className="relative">
                <input
                  id="moodle-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuário do Virtual2"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <User className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="moodle-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
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
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
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
              Entrar e Conquistar Meus Objetivos
            </LoginButton>
          </form>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Criptografia Ponta a Ponta AES-128
            </span>
            <a
              href="https://virtual2.ifnmg.edu.br"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 text-zinc-400 transition flex items-center gap-1"
            >
              virtual2.ifnmg.edu.br <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer: crédito + privacidade */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] text-zinc-500">
            IFNMG Assistente — Plataforma acadêmica independente criada para impulsionar seus resultados.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Desenvolvido e criado por</span>
            <a
              href="https://instagram.com/vinicius.tsx"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition"
            >
              @vinicius.tsx
            </a>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-xs">
            🔒 <strong className="text-zinc-400">Privacidade Absoluta:</strong> seus dados pertencem a você e são processados de forma segura e confidencial.
          </p>
        </div>
      </div>
    </div>
  );
}