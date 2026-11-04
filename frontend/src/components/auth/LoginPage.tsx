"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Glass } from "glisse";
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
  Shield,
  Layers,
} from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";

const features = [
  { icon: Calendar, title: "Prazos sob controle", text: "Tudo do Virtual2 em uma linha do tempo clara e preditiva." },
  { icon: BookOpen, title: "Materiais organizados", text: "PDFs, slides e conteúdos por disciplina com busca inteligente." },
  { icon: Sparkles, title: "Tutor IA com contexto", text: "IA avançada que lê suas matérias e responde com precisão." },
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
        err.message || "Não foi possível autenticar. Verifique suas credenciais do Virtual2."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden text-white flex flex-col justify-between">
      {/* Luz ambiente de refração profunda */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-[450px] w-[450px] rounded-full bg-teal-500/10 blur-[140px]" />

      <main className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-12">
        {/* Lado Esquerdo: Hero & Apresentação */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="hidden flex-col lg:flex"
        >
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-ink-950 shadow-[0_0_24px_rgba(69,255,156,0.35)]">
              <GraduationCap className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-lg font-bold leading-none tracking-tight text-white">IFNMG</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                Assistente Acadêmico
              </p>
            </div>
          </div>

          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Liquid Glass Experience • Sincronização Virtual2
          </div>

          <h1 className="font-display text-[clamp(2.8rem,4.5vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-white">
            Estude com clareza.
            <br />
            <span className="text-gradient-emerald">Entregue com folga.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-300">
            Sincronização em tempo real com o Virtual2 Moodle, gestão de prazos automatizada
            e tutoria inteligente com IA treinada nas suas matérias.
          </p>

          <div className="mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <Glass
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/[0.06] hover:-translate-y-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-xs font-semibold text-zinc-100">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{text}</p>
              </Glass>
            ))}
          </div>

          {/* Prévia tátil em Glass do Painel */}
          <Glass className="relative mt-10 max-w-lg rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(69,255,156,0.8)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Visão em Tempo Real
                </span>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-zinc-300">
                Semestre Ativo
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-bold leading-none text-white">
                  Atividades em dia
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  Próxima entrega revisada pelo Tutor IA
                </p>
              </div>
              <div className="flex -space-x-2">
                {[BookOpen, Calendar, Sparkles].map((Icon, index) => (
                  <span
                    key={index}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#121a16] bg-emerald-950 text-emerald-400 shadow-md"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-100">
                Briefing diário inteligente pronto • Plano de estudos sincronizado
              </p>
            </div>
          </Glass>
        </motion.section>

        {/* Lado Direito: Formulário de Autenticação */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md"
        >
          {/* Logo Mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-ink-950 shadow-[0_0_20px_rgba(69,255,156,0.35)]">
              <GraduationCap className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-none tracking-tight text-white">IFNMG</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                Assistente Acadêmico
              </p>
            </div>
          </div>

          <Glass className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Header do Card */}
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-7 py-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-inner">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-white">
                    Acessar Assistente
                  </h2>
                  <p className="text-xs text-zinc-400">Entre com seu login oficial do Virtual2</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5 p-7">
              <div>
                <label
                  htmlFor="moodle-username"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300"
                >
                  Usuário / CPF / Matrícula
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="moodle-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário no Virtual2"
                    required
                    className="h-12 w-full rounded-2xl border border-white/12 bg-white/[0.04] pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 backdrop-blur-md transition-all duration-200 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="moodle-password"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300"
                >
                  Senha do Virtual2
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="moodle-password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha acadêmica"
                    required
                    className="h-12 w-full rounded-2xl border border-white/12 bg-white/[0.04] pl-11 pr-12 text-sm text-white placeholder:text-zinc-500 backdrop-blur-md transition-all duration-200 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-white"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs leading-relaxed text-rose-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 font-display text-sm font-bold text-ink-950 shadow-[0_10px_25px_rgba(69,255,156,0.35)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(69,255,156,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <CogSpinner size={20} className="text-ink-950" />
                ) : (
                  <>
                    <span>Entrar no Assistente</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* Selo Oficial de Privacidade Solicitado */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Privacidade & Segurança Garantidas
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  Desenvolvido e criado por{" "}
                  <a
                    href="https://instagram.com/vinicius.tsx"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-white underline decoration-emerald-400/50 underline-offset-2 transition-colors hover:text-emerald-300"
                  >
                    @vinicius.tsx
                  </a>
                  . Nosso sistema segue todas as diretrizes de privacidade e não guardamos nenhum dado seu.
                </p>
              </div>
            </form>

            {/* Footer do Card */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-7 py-3.5 text-xs text-zinc-400">
              <span>Ambiente Acadêmico IFNMG</span>
              <a
                href="https://virtual2.ifnmg.edu.br"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-medium text-zinc-300 transition-colors hover:text-emerald-400"
              >
                Virtual2 Oficial <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Glass>
        </motion.section>
      </main>
    </div>
  );
}
