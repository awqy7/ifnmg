"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, Lock, User, ExternalLink } from "lucide-react";
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
        err.message || "Nao foi possivel autenticar. Verifique suas credenciais."
      );
    }
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      {/* Subtle ambient light */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-4 shadow-lg shadow-emerald-950/30">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">IFNMG Assistente</h1>
          <p className="text-neutral-500 text-xs mt-1">
            Conecte-se ao Virtual2
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-neutral-500" />
              Entrar
            </h2>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Use suas credenciais institucionais do IFNMG.
            </p>
          </div>

          <form className="space-y-3.5">
            <div>
              <label htmlFor="moodle-username" className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Usuario / CPF / Matricula
              </label>
              <div className="relative">
                <input
                  id="moodle-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuario do Virtual2"
                  required
                  className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                />
                <User className="w-3.5 h-3.5 text-neutral-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="moodle-password" className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Senha do Virtual2
              </label>
              <div className="relative">
                <input
                  id="moodle-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-3 text-red-400/90 text-xs">
                {error}
              </div>
            )}

            <LoginButton onLogin={handleLogin} onError={handleError}>
              Entrar
            </LoginButton>
          </form>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-neutral-600">
            <span>Conexao segura</span>
            <a
              href="https://virtual2.ifnmg.edu.br"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-400 transition-colors flex items-center gap-1"
            >
              Virtual2 <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-neutral-600 leading-relaxed">
          Plataforma academica independente.
          <br />
          Desenvolvido por{" "}
          <a
            href="https://instagram.com/vinicius.tsx"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-500/70 hover:text-emerald-400 transition-colors"
          >
            @vinicius.tsx
          </a>
        </p>
      </div>
    </div>
  );
}
