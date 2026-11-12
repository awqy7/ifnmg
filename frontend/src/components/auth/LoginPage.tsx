"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CogSpinner } from "@/components/ui/CogSpinner";

const highlights = [
  { icon: CalendarDays, label: "Prazos em perspectiva" },
  { icon: BookOpen, label: "Materiais por disciplina" },
  { icon: Sparkles, label: "Um tutor para suas dúvidas" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar. Confira seus dados e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page min-h-dvh p-3 sm:p-5 lg:p-8">
      <div className="login-layout mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-[1440px] overflow-hidden rounded-[1.75rem] sm:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="login-story relative hidden min-h-[760px] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
          <div className="story-grid absolute inset-0" aria-hidden="true" />
          <div className="story-orbit story-orbit-one" aria-hidden="true" />
          <div className="story-orbit story-orbit-two" aria-hidden="true" />

          <a href="https://www.ifnmg.edu.br/" className="relative z-10 inline-flex w-fit items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <GraduationCap className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.16em]">IFNMG</span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
                Assistente acadêmico
              </span>
            </span>
          </a>

          <div className="story-content relative z-10 my-10 max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
              Sua rotina acadêmica, em um só lugar
            </p>
            <h1 className="max-w-xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.045em] xl:text-6xl">
              Mais espaço
              <br />
              para aprender.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/65 xl:text-base">
              Organize seus estudos, acompanhe as atividades e encontre apoio para avançar no seu ritmo.
            </p>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {highlights.map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 text-xs text-white/75">
                  <Icon className="h-4 w-4 text-lime-300" strokeWidth={1.8} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 mt-8 text-[10px] tracking-wide text-white/45">
            Instituto Federal do Norte de Minas Gerais
          </p>
        </section>

        <section className="login-access flex min-h-[calc(100dvh-1.5rem)] flex-col justify-between px-5 py-7 sm:px-10 sm:py-10 lg:min-h-0 lg:px-12 xl:px-16">
          <a href="https://www.ifnmg.edu.br/" className="inline-flex w-fit items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300 text-ink-950">
              <GraduationCap className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.14em] text-white">IFNMG</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">Assistente acadêmico</span>
            </span>
          </a>

          <div className="mx-auto my-auto w-full max-w-[400px] py-10 lg:py-4">
            <div className="mb-8">
              <div className="mb-5 hidden h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-300 lg:flex">
                <LockKeyhole className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-lime-300">Bem-vindo de volta</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                Acesse seus estudos
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Use as mesmas credenciais do Virtual2 para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="moodle-username" className="mb-2 block text-sm font-bold text-zinc-200">
                  Usuário, CPF ou matrícula
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="moodle-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Seu usuário do Virtual2"
                    required
                    className="login-input h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="moodle-password" className="mb-2 block text-sm font-bold text-zinc-200">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="moodle-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha acadêmica"
                    required
                    className="login-input h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-12 text-sm text-white placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm leading-5 text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-ink-950 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <CogSpinner size={18} className="text-ink-950" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Entrar no assistente
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>

              <p className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3 text-xs leading-5 text-zinc-400">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                Suas credenciais são usadas para conectar ao ambiente Virtual2 do IFNMG.
              </p>
            </form>

            <a
              href="https://virtual2.ifnmg.edu.br/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-violet-300 transition-colors hover:text-white"
            >
              Acessar o Virtual2
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-zinc-500">
            <span>IFNMG · Assistente acadêmico</span>
            <span>Ambiente de apoio aos estudos</span>
          </div>
        </section>
      </div>
    </main>
  );
}
