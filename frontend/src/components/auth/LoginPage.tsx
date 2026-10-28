"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, Lock, User, ExternalLink, BookOpen, Calendar, Sparkles } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (err: any) {
      setError(
        err.message || "Não foi possível autenticar. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--ifnmgreen)]/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[300px] bg-blue-500/[0.015] rounded-full blur-[100px]" />
      </div>

      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md relative z-10">
          {/* ── Brand / Hero ── */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--ifnmgreen)] to-[var(--ifnmgreen)] mb-4 shadow-lg shadow-[var(--ifnmgreen)]/40">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
              IFNMG Assistente
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Seu tutor acadêmico de elite — conecte-se ao Virtual2
            </p>
          </div>

          {/* ── Feature highlights ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-1">
                <Calendar className="w-4 h-4 text-[var(--ifnmgreen)]/70" />
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">Prazos</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-1">
                <BookOpen className="w-4 h-4 text-[var(--ifnmgreen)]/70" />
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">Materias</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-1">
                <Sparkles className="w-4 h-4 text-[var(--ifnmgreen)]/70" />
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">IA Tutor</span>
            </div>
          </div>

          {/* ── Login Card ── */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-lg shadow-black/20">
            <div className="space-y-1 mb-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                Entrar
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                Use suas credenciais institucionais do IFNMG.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="moodle-username" className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5">
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
                    className="w-full bg-[var(--surface-inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ifnmgreen)]/[0.40] focus:ring-1 focus:ring-[var(--ifnmgreen)]/20 transition-colors"
                  />
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label htmlFor="moodle-password" className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5">
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
                    className="w-full bg-[var(--surface-inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ifnmgreen)]/[0.40] focus:ring-1 focus:ring-[var(--ifnmgreen)]/20 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
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

              <button
                type="submit"
                disabled={loading}
                className="relative w-full min-h-11 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[var(--ifnmgreen)] to-[var(--ifnmgreen)] hover:from-[var(--ifnmgreen)] hover:to-[var(--ifnmgreen)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-semibold text-white text-sm tracking-wide shadow-lg shadow-[var(--ifnmgreen)]/30"
              >
                {loading ? <CogSpinner size={22} className="text-white" /> : "Entrar"}
              </button>
            </form>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>Conexão segura e criptografada</span>
              <a
                href="https://virtual2.ifnmg.edu.br"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
              >
                Virtual2 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="mt-5 text-center text-[10px] text-[var(--text-tertiary)] leading-relaxed">
            Plataforma acadêmica independente.
            <br />
            Desenvolvido por{" "}
            <a
              href="https://instagram.com/vinicius.tsx"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--ifnmgreen)]/70 hover:text-[var(--ifnmgreen)] transition-colors"
            >
              @vinicius.tsx
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
