"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ViewType } from "./Dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { Glass } from "glisse";
import {
  Sparkles,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Target,
  Timer,
  CheckCircle2,
  CalendarDays,
  MessageSquare,
  Clock3,
} from "lucide-react";
import { briefingApi, dashboardApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
import Markdown from "@/components/Markdown";

interface DashboardHomeProps {
  onNavigate: (view: ViewType) => void;
  openChat: (courseId?: string) => void;
  openActivity?: (activityId: string) => void;
}

export default function DashboardHome({ onNavigate, openChat, openActivity }: DashboardHomeProps) {
  const { user } = useAuth();
  const { syncing } = useSync();
  const [briefing, setBriefing] = useState<any | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const initialSyncDone = useRef(false);

  const loadData = useCallback(async () => {
    setDataError(null);
    try {
      const snapshot = await dashboardApi.getSnapshot();
      setBriefing(snapshot.briefing);
      setPendingActivities(snapshot.pending_activities || []);
      setCourses(snapshot.courses || []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
    } finally {
      setLoadingBriefing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener("data-refresh", handleRefresh);
    return () => window.removeEventListener("data-refresh", handleRefresh);
  }, [loadData]);

  const handleGenerateBriefing = async () => {
    if (syncing || generatingBriefing) return;
    setGeneratingBriefing(true);
    try {
      const res: any = await briefingApi.generate();
      if (res && res.content) {
        setBriefing(res);
      } else {
        const today = await briefingApi.getToday();
        setBriefing(today);
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Não foi possível gerar o briefing.");
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const rawToday = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);
  const firstName = user?.name ? user.name.split(" ")[0] : "estudante";

  const courseCount = courses.length;
  const taskCount = briefing?.metrics?.pending ?? pendingActivities.length;
  const lateCount = briefing?.metrics?.late ?? pendingActivities.filter((item) => item.status === "late").length;
  const due24hCount = briefing?.metrics?.due_24h ?? 0;
  const studyPlanMinutes = (briefing?.study_plan || []).reduce(
    (total: number, item: any) => total + item.minutes,
    0
  );

  const formatDeadline = (value?: string | null) => {
    if (!value) return "Sem prazo definido";
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTaskDate = (value?: string | null) => {
    if (!value) return "Sem prazo";
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const metrics = [
    {
      label: taskCount === 1 ? "Pendência" : "Pendências",
      value: taskCount,
      icon: CheckCircle2,
      hint: taskCount === 1 ? "atividade em aberto" : "atividades em aberto",
      color: "text-emerald-400",
    },
    {
      label: "Próximas 24h",
      value: due24hCount,
      icon: Timer,
      hint: "prazos urgentes",
      color: due24hCount > 0 ? "text-amber-400" : "text-zinc-400",
    },
    {
      label: lateCount === 1 ? "Atrasada" : "Atrasadas",
      value: lateCount,
      icon: AlertTriangle,
      hint: lateCount === 1 ? "requer atenção" : "requerem atenção",
      color: lateCount > 0 ? "text-rose-400" : "text-zinc-400",
    },
    {
      label: courseCount === 1 ? "Disciplina" : "Disciplinas",
      value: courseCount,
      icon: BookOpen,
      hint: "sincronizadas com Virtual2",
      color: "text-sky-400",
    },
  ];

  const heroPriority = briefing?.top_priority;

  return (
    <div className="view-page view-home space-y-6">
      {/* Header com Saudação & Botões de Ação */}
      <div className="dashboard-welcome flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-[0.14em] text-emerald-300">Painel do estudante</span>
            <span className="text-zinc-600">/</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              {today}
            </span>
            {lateCount > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                  <AlertTriangle className="h-3 w-3" />
                  {lateCount} {lateCount === 1 ? "atrasada" : "atrasadas"}
                </span>
              </>
            )}
          </div>

          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {getGreeting()}, <span className="text-gradient-emerald">{firstName}</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-300">
            {taskCount > 0 ? (
              <>
                Você possui{" "}
                <span className="font-semibold text-white">
                  {taskCount} {taskCount === 1 ? "atividade pendente" : "atividades pendentes"}
                </span>
                . Seus prazos e tutorias estão organizados abaixo.
              </>
            ) : (
              "Nenhuma pendência acadêmica no momento. Seus materiais e tutor estão a postos."
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Button
            onClick={() => openChat()}
            variant="glass"
            size="sm"
            className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/15"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Tutor IA
          </Button>
          <Button
            onClick={() => onNavigate("atividades")}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <span>Ver atividades</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {dataError && (
        <Glass
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300"
        >
          <span>{dataError}</span>
          <Button type="button" variant="ghost" size="sm" onClick={loadData} className="shrink-0 text-rose-200">
            Tentar novamente
          </Button>
        </Glass>
      )}

      {/* Grid de Métricas Principais em Glass Cards */}
      <section aria-label="Métricas de desempenho" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Glass
              key={metric.label}
              className="dashboard-metric rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg backdrop-blur-2xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{metric.label}</p>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <p
                className={`mt-3 font-display text-3xl font-extrabold tabular-nums tracking-tight ${metric.color}`}
              >
                {loadingBriefing ? "—" : metric.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{metric.hint}</p>
            </Glass>
          );
        })}
      </section>

      {/* Layout Principal: 2 Colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Coluna Esquerda: Prioridade & Tarefas */}
        <div className="min-w-0 space-y-6">
          {/* Card de Prioridade Agora */}
          <Glass className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Prioridade Máxima</h2>
              </div>
              {heroPriority && (
                <span
                  className={`chip ${
                    heroPriority.status === "late"
                      ? "chip-urgent"
                      : "chip-accent"
                  }`}
                >
                  {heroPriority.status === "late" ? "Atrasada" : "Próxima Entrega"}
                </span>
              )}
            </div>

            {heroPriority ? (
              <button
                type="button"
                onClick={() => openActivity?.(heroPriority.id)}
                className="group flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-white/[0.03] xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-emerald-300">
                    {heroPriority.title}
                  </h3>
                  <p className="mt-1 truncate text-xs font-medium text-zinc-400">{heroPriority.course_name}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                    <Clock3 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className={heroPriority.status === "late" ? "text-rose-400 font-semibold" : ""}>
                      {formatDeadline(heroPriority.due_date)}
                    </span>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-all group-hover:bg-emerald-500/20 group-hover:text-emerald-200">
                  Abrir detalhes
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-start gap-3 p-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Tudo em dia por enquanto</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Nenhuma entrega urgente pendente nas próximas horas.
                  </p>
                </div>
                <Button onClick={() => onNavigate("atividades")} variant="outline" size="sm">
                  Explorar todas as atividades
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </Glass>

          {/* Card de Tarefas Pendentes */}
          <Glass className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Tarefas Pendentes</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {taskCount} {taskCount === 1 ? "entrega em aberto" : "entregas em aberto"}
                </p>
              </div>
              <button
                onClick={() => onNavigate("atividades")}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {pendingActivities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400/60" />
                <p className="text-sm font-medium text-zinc-300">Nenhuma tarefa pendente. Parabéns!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {pendingActivities.slice(0, 5).map((act) => (
                  <button
                    type="button"
                    key={act.id}
                    onClick={() => openActivity?.(act.id)}
                    className="group flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        act.status === "late"
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                          : "bg-emerald-400 shadow-[0_0_6px_rgba(185,232,106,0.6)]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-emerald-300">
                        {act.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
                        {act.course_name || "Disciplina IFNMG"}
                        <span className="px-1.5 text-zinc-600">·</span>
                        <span className={act.status === "late" ? "text-rose-400 font-medium" : ""}>
                          {formatTaskDate(act.due_date)}
                        </span>
                      </p>
                    </div>
                    <span className="hidden shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300 sm:inline">
                      {act.type}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
                  </button>
                ))}
              </div>
            )}
          </Glass>
        </div>

        {/* Coluna Direita: Briefing IA & Disciplinas */}
        <div className="min-w-0 space-y-6">
          {/* Briefing do Dia IA */}
          <Glass className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] shadow-xl backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Briefing Diário com IA</h2>
                  <span className="chip chip-accent">IA Ativa</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {syncing ? "Sincronizando dados em segundo plano" : "Recomendações e plano de estudo personalizado"}
                </p>
              </div>
              <Button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing || syncing}
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
              >
                {generatingBriefing ? (
                  <CogSpinner size={13} className="text-emerald-400" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{generatingBriefing ? "Gerando..." : "Atualizar"}</span>
              </Button>
            </div>

            {loadingBriefing ? (
              <div className="space-y-3 p-5">
                <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ) : briefing ? (
              <div className="space-y-5 p-5">
                {briefing.awaiting_confirmation?.length > 0 && (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-sky-300">
                        Aguardando confirmação do Virtual2
                      </p>
                      <p className="mt-0.5 text-[11px] text-sky-200/80">
                        {briefing.awaiting_confirmation.length}{" "}
                        {briefing.awaiting_confirmation.length === 1
                          ? "entrega informada por você"
                          : "entregas informadas por você"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("atividades")}
                      className="shrink-0 text-xs font-bold text-sky-300 hover:text-white transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                )}

                <div className="text-sm leading-relaxed text-zinc-200">
                  <Markdown content={briefing.content} />
                </div>

                {briefing.study_plan?.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Plano Recomendado</h3>
                      <span className="text-xs font-semibold tabular-nums text-emerald-400">
                        {studyPlanMinutes} min sugeridos
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                      {briefing.study_plan.map((item: any, index: number) => (
                        <button
                          key={`${item.id}-${index}`}
                          onClick={() => openActivity?.(item.id)}
                          className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-emerald-400">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-emerald-300">
                              {item.label}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                              {item.course_name}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-zinc-400 font-medium">
                            {item.minutes} min
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 p-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Nenhum briefing gerado hoje</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    O Tutor IA pode analisar suas matérias e criar um roteiro com prioridades e tempos sugeridos.
                  </p>
                </div>
                <Button onClick={handleGenerateBriefing} disabled={syncing} variant="default" size="sm">
                  {syncing ? <CogSpinner size={14} className="text-ink-950" /> : <Sparkles className="h-4 w-4" />}
                  Gerar Briefing com IA
                </Button>
              </div>
            )}
          </Glass>

          {/* Card de Disciplinas */}
          <Glass className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Suas Disciplinas</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {courses.length} {courses.length === 1 ? "matéria conectada" : "matérias conectadas"}
                </p>
              </div>
              <button
                onClick={() => onNavigate("cursos")}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <BookOpen className="h-6 w-6 text-zinc-500" />
                <p className="text-xs text-zinc-400">Nenhuma disciplina sincronizada ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {courses.slice(0, 6).map((crs) => (
                  <button
                    type="button"
                    key={crs.id}
                    onClick={() => openChat(crs.id)}
                    className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-emerald-300">
                        {crs.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        {crs.teacher || "Docente IFNMG"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-400 font-medium">
                      {crs.pending_activities || 0} pend.
                    </span>
                    <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-emerald-400" />
                  </button>
                ))}
              </div>
            )}
          </Glass>
        </div>
      </div>
    </div>
  );
}
