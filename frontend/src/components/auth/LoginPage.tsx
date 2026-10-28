"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  User,
  ExternalLink,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";

const features = [
  { icon: Calendar, title: "Prazos sob controle", text: "Tudo do Virtual2 em uma linha do tempo clara." },
  { icon: BookOpen, title: "Materiais organizados", text: "PDFs e conteúdos por disciplina, com busca." },
  { icon: Sparkles, title: "Tutor com contexto", text: "IA que lê seus materiais e responde com base neles." },
];

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
    <div className="app-backdrop relative min-h-dvh overflow-hidden text-white">
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-0 h-[460px] w-[460px] rounded-full bg-accent/[0.07] blur-[130px]" />

      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[1240px] grid-cols-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-12">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="hidden flex-col lg:flex"
        >
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow-sm">
              <GraduationCap className="h-5 w-5 text-ink-950" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-none tracking-tight">IFNMG</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent/80">
                Assistente acadêmico
              </p>
            </div>
          </div>

          <span className="chip chip-accent mb-5 w-fit">
            <span className="accent-dot" /> Integrado ao Virtual2
          </span>

          <h1 className="font-display text-[clamp(2.6rem,4.6vw,4.2rem)] font-bold leading-[0.98] tracking-[-0.04em]">
            Estude com clareza.
            <br />
            <span className="text-gradient-accent">Entregue com folga.</span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400">
            Suas disciplinas, prazos e materiais em um só lugar — com um tutor de IA
            que entende o seu semestre.
          </p>

          <div className="mt-8 grid max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 backdrop-blur-sm transition-colors hover:border-accent/25 hover:bg-accent/[0.04]"
              >
                <Icon className="h-4 w-4 text-accent" />
                <p className="mt-2.5 text-[11px] font-semibold text-zinc-200">{title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{text}</p>
              </div>
            ))}
          </div>

          {/* Prévia do painel */}
          <div className="relative mt-10 max-w-lg">
            <div className="panel-accent panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Seu dia
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">Hoje</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-bold leading-none text-white">
                    3 entregas
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-status-warning">
                    <Clock3 className="h-3 w-3" /> 1 vence nas próximas 24h
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {[BookOpen, Calendar, Sparkles].map((Icon, index) => (
                    <span
                      key={index}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-850 bg-ink-750 text-accent"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <p className="text-[10px] text-zinc-400">Briefing do dia pronto · plano de estudo sugerido</p>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-zinc-600" />
              </div>
            </div>
          </div>

          <p className="mt-8 text-[10px] text-zinc-600">
            Plataforma acadêmica independente · Desenvolvido por{" "}
            <a
              href="https://instagram.com/vinicius.tsx"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-zinc-400 transition-colors hover:text-accent"
            >
              @vinicius.tsx
            </a>
          </p>
        </motion.section>

        {/* Login */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow-sm">
              <GraduationCap className="h-5 w-5 text-ink-950" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-none tracking-tight text-white">IFNMG</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">
                Assistente acadêmico
              </p>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-white/[0.07] bg-white/[0.02] px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.09] text-accent">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight text-white">
                    Entrar na sua conta
                  </h2>
                  <p className="text-[10px] text-zinc-600">Use suas credenciais do Virtual2</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 p-6">
              <div>
                <label htmlFor="moodle-username" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Usuário / CPF / Matrícula
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="moodle-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário do Virtual2"
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="moodle-password" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Senha do Virtual2
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="moodle-password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-12 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-status-urgent/20 bg-status-urgent/[0.08] px-3.5 py-2.5 text-[11px] leading-relaxed text-status-urgent">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient text-sm font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <CogSpinner size={20} className="text-ink-950" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-600">
                <ShieldCheck className="h-3 w-3 text-accent/70" />
                Conexão segura e criptografada
              </div>
            </form>

            <div className="flex items-center justify-between border-t border-white/[0.07] bg-white/[0.015] px-6 py-3 text-[10px] text-zinc-600">
              <span>Não é o Virtual2 oficial</span>
              <a
                href="https://virtual2.ifnmg.edu.br"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-medium text-zinc-400 transition-colors hover:text-accent"
              >
                Abrir Virtual2 <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] leading-relaxed text-zinc-600 lg:hidden">
            Plataforma acadêmica independente.
            <br />
            Desenvolvido por{" "}
            <a
              href="https://instagram.com/vinicius.tsx"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-zinc-400 transition-colors hover:text-accent"
            >
              @vinicius.tsx
            </a>
          </p>
        </motion.section>
      </div>
    </div>
  );
}
