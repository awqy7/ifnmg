"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ViewType } from "./Dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import {
  Sparkles,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Target,
  Timer,
  CheckCircle2,
  CalendarDays,
  MessageSquare,
  Layers,
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

  const courseCount = courses.length;
  const taskCount = briefing?.metrics?.pending ?? pendingActivities.length;
  const lateCount = briefing?.metrics?.late ?? pendingActivities.filter((item) => item.status === "late").length;
  const due24hCount = briefing?.metrics?.due_24h ?? 0;

  const formatDeadline = (value?: string | null) => {
    if (!value) return "Sem prazo definido";
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const metrics = [
    {
      label: courseCount === 1 ? "Disciplina" : "Disciplinas",
      value: courseCount,
      icon: BookOpen,
      hint: courseCount === 1 ? "conectada ao Virtual2" : "conectadas ao Virtual2",
    },
    {
      label: taskCount === 1 ? "Pendência" : "Pendências",
      value: taskCount,
      icon: CheckCircle2,
      hint: taskCount === 1 ? "atividade em aberto" : "atividades em aberto",
    },
    { label: "Próximas 24h", value: due24hCount, icon: Timer, hint: "prazos iminentes" },
    {
      label: lateCount === 1 ? "Atrasada" : "Atrasadas",
      value: lateCount,
      icon: AlertTriangle,
      hint: lateCount === 1 ? "precisa de atenção" : "precisam de atenção",
    },
  ];

  const heroPriority = briefing?.top_priority;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="panel relative overflow-hidden p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/[0.12] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-accent/[0.05] blur-[110px]" />
        <div className="relative z-10 grid gap-7 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-accent">
                <CalendarDays className="h-3 w-3" /> {today}
              </span>
              {lateCount > 0 && (
                <span className="chip border-status-urgent/25 bg-status-urgent/[0.08] text-status-urgent">
                  <AlertTriangle className="h-3 w-3" /> {lateCount} atrasada{lateCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.04em] text-white">
              {getGreeting()},{" "}
              <span className="text-gradient-accent">
                {user?.name ? user.name.split(" ")[0] : "estudante"}
              </span>
              <span className="text-accent">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              {taskCount > 0 ? (
                <>
                  Você tem{" "}
                  <span className="font-semibold text-accent-light">
                    {taskCount} {taskCount === 1 ? "tarefa pendente" : "tarefas pendentes"}
                  </span>
                  . Priorize o que vence primeiro e mantenha o ritmo.
                </>
              ) : (
                "Nenhuma tarefa pendente no momento. Aproveite para revisar os materiais."
              )}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button onClick={() => openChat()} variant="accent" size="default">
                <Sparkles className="h-4 w-4" />
                Perguntar ao tutor
              </Button>
              <Button onClick={() => onNavigate("atividades")} variant="outline" size="default">
                Ver atividades
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Foco rápido */}
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[9px]">Foco agora</span>
              <Target className="h-4 w-4 text-accent/70" />
            </div>
            {heroPriority ? (
              <button
                type="button"
                onClick={() => openActivity?.(heroPriority.id)}
                className="group mt-3 w-full text-left"
              >
                <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white transition-colors group-hover:text-accent-light">
                  {heroPriority.title}
                </p>
                <p className="mt-1 truncate text-[10px] text-zinc-500">{heroPriority.course_name}</p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className={heroPriority.status === "late" ? "font-medium text-status-urgent" : "text-zinc-500"}>
                    {formatDeadline(heroPriority.due_date)}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-accent">
                    Abrir <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </button>
            ) : (
              <div className="mt-3">
                <p className="font-display text-sm font-semibold text-white">Tudo em dia por aqui</p>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  Nenhuma prioridade crítica no momento.
                </p>
                <button
                  onClick={() => onNavigate("atividades")}
                  className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-accent"
                >
                  Revisar atividades <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {dataError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.07] px-4 py-3 text-xs text-status-urgent">
          <span>{dataError}</span>
          <Button type="button" variant="outline" size="sm" onClick={loadData} className="shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const highlight = index === 0;
          return (
            <div
              key={metric.label}
              className={`card-enter rounded-3xl border p-4 transition-colors ${
                highlight
                  ? "border-accent/25 bg-accent/[0.07]"
                  : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
              }`}
              style={{ animationDelay: `${40 + index * 45}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${highlight ? "bg-accent text-ink-950" : "bg-white/[0.05] text-zinc-400"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {index === 3 && lateCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-status-urgent shadow-[0_0_12px_rgba(255,95,109,0.7)]" />
                )}
              </div>
              <p className="mt-4 font-display text-3xl font-bold leading-none tracking-tight text-white">
                {loadingBriefing ? "—" : metric.value}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-zinc-300">{metric.label}</p>
              <p className="mt-0.5 text-[9px] text-zinc-600">{metric.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Briefing */}
      <div className="card-enter panel overflow-hidden" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.09] text-accent">
              <Zap className="h-[18px] w-[18px]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-white">Briefing do dia</h2>
                <span className="chip chip-accent py-0 text-[9px]">IA</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {syncing ? "Atualizando dados em segundo plano" : "Prioridades, prazos e plano de estudo"}
              </p>
            </div>
          </div>
          <Button
            onClick={handleGenerateBriefing}
            disabled={generatingBriefing || syncing}
            variant="outline"
            size="sm"
          >
            {generatingBriefing ? (
              <>
                <CogSpinner size={14} className="text-accent" />
                <span>Gerando</span>
              </>
            ) : syncing ? (
              <>
                <CogSpinner size={12} className="text-zinc-400" />
                <span>Sincronizando</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Atualizar</span>
              </>
            )}
          </Button>
        </div>

        <div className="p-4 sm:p-5">
          {loadingBriefing ? (
            <div className="flex h-44 items-center justify-center">
              <CogSpinner size={20} className="text-zinc-600" />
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              {briefing.top_priority && (
                <button
                  onClick={() => openActivity?.(briefing.top_priority.id)}
                  className={`group relative w-full overflow-hidden rounded-3xl border p-4 text-left sm:p-5 ${
                    briefing.top_priority.status === "late"
                      ? "border-status-urgent/25 bg-status-urgent/[0.06]"
                      : "border-accent/25 bg-accent/[0.06]"
                  }`}
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          <Target className={`h-3.5 w-3.5 ${briefing.top_priority.status === "late" ? "text-status-urgent" : "text-accent"}`} />
                          Foco principal
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          briefing.top_priority.status === "late"
                            ? "bg-status-urgent/15 text-status-urgent"
                            : "bg-accent/15 text-accent-light"
                        }`}>
                          {briefing.top_priority.status === "late" ? "Atrasada" : "Prioridade"}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-semibold leading-snug text-white transition-colors group-hover:text-accent-light sm:text-lg">
                        {briefing.top_priority.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-zinc-500">{briefing.top_priority.course_name}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <Timer className="h-3 w-3 text-zinc-500" />
                        {formatDeadline(briefing.top_priority.due_date)}
                      </div>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-300 transition-all group-hover:border-accent/30 group-hover:text-accent">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-accent/[0.08] blur-3xl" />
                </button>
              )}

              <div className="panel-soft p-4">
                <Markdown content={briefing.content} />
              </div>

              {briefing.awaiting_confirmation?.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-status-info/20 bg-status-info/[0.06] p-3.5">
                  <div>
                    <p className="text-[11px] font-semibold text-status-info">Aguardando confirmação do Virtual2</p>
                    <p className="mt-0.5 text-[10px] text-status-info/70">
                      {briefing.awaiting_confirmation.length}{" "}
                      {briefing.awaiting_confirmation.length === 1
                        ? "entrega informada por você"
                        : "entregas informadas por você"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate("atividades")}
                    className="shrink-0 text-[10px] font-semibold text-status-info transition-colors hover:text-white"
                  >
                    Ver atividades
                  </button>
                </div>
              )}

              {briefing.study_plan?.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Plano recomendado
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Layers className="h-3 w-3" />
                      {briefing.study_plan.reduce((total: number, item: any) => total + item.minutes, 0)} min
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {briefing.study_plan.map((item: any, index: number) => (
                      <button
                        key={`${item.id}-${index}`}
                        onClick={() => openActivity?.(item.id)}
                        className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition-colors hover:border-accent/25 hover:bg-accent/[0.05]"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                            {index + 1}
                          </span>
                          <span className="text-[9px] text-zinc-600">{item.minutes} min</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-zinc-300 group-hover:text-white">
                          {item.label}
                        </p>
                        <p className="mt-1 truncate text-[9px] text-zinc-600">{item.course_name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-white">Seu dia, resumido pela IA</p>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-zinc-500">
                  Gere o briefing diário para ver prioridades, prazos e um plano de estudo sob medida.
                </p>
              </div>
              <Button onClick={handleGenerateBriefing} disabled={syncing} variant="accent" size="sm">
                {syncing ? <CogSpinner size={14} className="text-ink-950" /> : "Gerar briefing"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tarefas + Disciplinas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card-enter panel overflow-hidden" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center justify-between border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-warning/20 bg-status-warning/[0.08] text-status-warning">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-sm font-semibold text-white">Tarefas pendentes</h2>
                <p className="text-[10px] text-zinc-500">
                  {taskCount} {taskCount === 1 ? "entrega em aberto" : "entregas em aberto"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("atividades")}
              className="flex items-center gap-1 text-[10px] font-semibold text-accent transition-colors hover:text-accent-light"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-[330px] space-y-1.5 overflow-y-auto p-3">
            {pendingActivities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-6 w-6 text-accent/60" />
                <p className="text-xs text-zinc-500">Nenhuma tarefa pendente. Tudo em dia.</p>
              </div>
            ) : (
              pendingActivities.slice(0, 5).map((act) => (
                <button
                  type="button"
                  key={act.id}
                  onClick={() => openActivity && openActivity(act.id)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.035]"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${act.status === "late" ? "bg-status-urgent" : "bg-accent"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-zinc-200 transition-colors group-hover:text-white">
                      {act.title}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-zinc-600">
                      {act.course_name || "Disciplina"} ·{" "}
                      {act.due_date
                        ? new Date(act.due_date).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sem prazo"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-zinc-500">
                    {act.type}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card-enter panel overflow-hidden" style={{ animationDelay: "190ms" }}>
          <div className="flex items-center justify-between border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-sm font-semibold text-white">Disciplinas</h2>
                <p className="text-[10px] text-zinc-500">{courses.length} matérias conectadas</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("cursos")}
              className="flex items-center gap-1 text-[10px] font-semibold text-accent transition-colors hover:text-accent-light"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid max-h-[330px] grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
            {courses.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BookOpen className="h-6 w-6 text-accent/50" />
                <p className="text-xs text-zinc-500">Nenhuma disciplina sincronizada.</p>
              </div>
            ) : (
              courses.slice(0, 6).map((crs, index) => (
                <button
                  type="button"
                  key={crs.id}
                  onClick={() => openChat(crs.id)}
                  className="group flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-left transition-all hover:border-accent/25 hover:bg-accent/[0.04]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 font-display text-[10px] font-bold text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <MessageSquare className="h-3.5 w-3.5 text-zinc-700 transition-colors group-hover:text-accent" />
                    </div>
                    <h4 className="mt-2.5 line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-200 transition-colors group-hover:text-white">
                      {crs.name}
                    </h4>
                    <p className="mt-1 truncate text-[9px] text-zinc-600">
                      {crs.teacher || "Docente IFNMG"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2 text-[9px]">
                    <span className="text-zinc-600">{crs.pending_activities || 0} pendentes</span>
                    <span className="flex items-center gap-1 font-semibold text-accent/80">
                      Tutor <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
