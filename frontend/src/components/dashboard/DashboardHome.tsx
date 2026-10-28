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
  Target,
  Timer,
  CheckCircle2,
  CalendarDays,
  MessageSquare,
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
    },
    { label: "Próximas 24h", value: due24hCount, icon: Timer, hint: "prazos iminentes" },
    {
      label: lateCount === 1 ? "Atrasada" : "Atrasadas",
      value: lateCount,
      icon: AlertTriangle,
      hint: lateCount === 1 ? "precisa de atenção" : "precisam de atenção",
      alert: lateCount > 0,
    },
    {
      label: courseCount === 1 ? "Disciplina" : "Disciplinas",
      value: courseCount,
      icon: BookOpen,
      hint: courseCount === 1 ? "conectada ao Virtual2" : "conectadas ao Virtual2",
    },
  ];

  const heroPriority = briefing?.top_priority;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </span>
            {lateCount > 0 && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-status-urgent">
                  {lateCount} {lateCount === 1 ? "atrasada" : "atrasadas"}
                </span>
              </>
            )}
          </div>

          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-zinc-400">
            {taskCount > 0 ? (
              <>
                Você tem{" "}
                <span className="font-medium text-zinc-200">
                  {taskCount} {taskCount === 1 ? "tarefa pendente" : "tarefas pendentes"}
                </span>
                . O próximo prazo está logo abaixo.
              </>
            ) : (
              "Nenhuma pendência agora. Seus materiais continuam disponíveis."
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onClick={() => openChat()} variant="outline" size="sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Tutor IA
          </Button>
          <Button onClick={() => onNavigate("atividades")} variant="accent" size="sm">
            Ver atividades
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {dataError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-status-urgent/20 px-3 py-2.5 text-xs text-status-urgent"
        >
          <span>{dataError}</span>
          <Button type="button" variant="ghost" size="sm" onClick={loadData} className="shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      <section aria-label="Resumo acadêmico" className="panel overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-white/[0.07] lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-ink-900 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-zinc-500">{metric.label}</p>
                  <Icon className="h-3.5 w-3.5 text-zinc-600" />
                </div>
                <p
                  className={`mt-2 font-display text-2xl font-semibold tabular-nums ${
                    metric.alert ? "text-status-urgent" : "text-white"
                  }`}
                >
                  {loadingBriefing ? "—" : metric.value}
                </p>
                <p className="mt-1 text-[11px] text-zinc-600">{metric.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-zinc-500" />
                <h2 className="text-[13px] font-medium text-zinc-200">Prioridade agora</h2>
              </div>
              {heroPriority && (
                <span
                  className={`chip ${
                    heroPriority.status === "late"
                      ? "border-status-urgent/20 text-status-urgent"
                      : "border-accent/20 text-accent"
                  }`}
                >
                  {heroPriority.status === "late" ? "Atrasada" : "Em aberto"}
                </span>
              )}
            </div>

            {heroPriority ? (
              <button
                type="button"
                onClick={() => openActivity?.(heroPriority.id)}
                className="group flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-white/[0.02] sm:p-5 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-white">
                    {heroPriority.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{heroPriority.course_name}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
                    <Timer className="h-3.5 w-3.5" />
                    <span className={heroPriority.status === "late" ? "text-status-urgent" : ""}>
                      {formatDeadline(heroPriority.due_date)}
                    </span>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors group-hover:border-white/20 group-hover:bg-white/[0.05] group-hover:text-white xl:self-auto">
                  Abrir atividade
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-start gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-[13px] font-medium text-zinc-200">Nenhuma prioridade crítica</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Quando houver uma entrega próxima, ela aparece aqui.
                  </p>
                </div>
                <Button onClick={() => onNavigate("atividades")} variant="outline" size="sm">
                  Revisar atividades
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[13px] font-medium text-zinc-200">Tarefas pendentes</h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {taskCount} {taskCount === 1 ? "entrega em aberto" : "entregas em aberto"}
                </p>
              </div>
              <button
                onClick={() => onNavigate("atividades")}
                className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-white"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {pendingActivities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-5 w-5 text-zinc-600" />
                <p className="text-xs text-zinc-500">Nenhuma tarefa pendente. Tudo em dia.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {pendingActivities.slice(0, 5).map((act) => (
                  <button
                    type="button"
                    key={act.id}
                    onClick={() => openActivity?.(act.id)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025] sm:px-5"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        act.status === "late" ? "bg-status-urgent" : "bg-zinc-600"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-white">
                        {act.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {act.course_name || "Disciplina"}
                        <span className="px-1.5 text-zinc-700">·</span>
                        <span className={act.status === "late" ? "text-status-urgent" : ""}>
                          {formatTaskDate(act.due_date)}
                        </span>
                      </p>
                    </div>
                    <span className="hidden shrink-0 rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[10px] text-zinc-500 sm:inline">
                      {act.type}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="panel overflow-hidden">
            <div className="flex items-start justify-between gap-2 border-b border-white/[0.07] px-4 py-3 sm:px-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-medium text-zinc-200">Briefing do dia</h2>
                  <span className="chip">IA</span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {syncing ? "Atualizando dados em segundo plano" : "Prioridades e plano de estudo"}
                </p>
              </div>
              <Button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing || syncing}
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2 text-[11px] text-zinc-400"
              >
                {generatingBriefing ? (
                  <CogSpinner size={13} className="text-zinc-400" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{generatingBriefing ? "Gerando" : "Atualizar"}</span>
              </Button>
            </div>

            {loadingBriefing ? (
              <div className="space-y-2.5 p-4 sm:p-5">
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ) : briefing ? (
              <div className="space-y-4 p-4 sm:p-5">
                {briefing.awaiting_confirmation?.length > 0 && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-status-info/20 px-3 py-2.5">
                    <div>
                      <p className="text-[11px] font-medium text-status-info">
                        Aguardando confirmação do Virtual2
                      </p>
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
                      className="shrink-0 text-[10px] font-medium text-status-info transition-colors hover:text-white"
                    >
                      Ver
                    </button>
                  </div>
                )}

                <div className="text-[13px] leading-relaxed text-zinc-400">
                  <Markdown content={briefing.content} />
                </div>

                {briefing.study_plan?.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[11px] font-medium text-zinc-500">Plano recomendado</h3>
                      <span className="text-[11px] tabular-nums text-zinc-600">
                        {studyPlanMinutes} min
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.07]">
                      {briefing.study_plan.map((item: any, index: number) => (
                        <button
                          key={`${item.id}-${index}`}
                          onClick={() => openActivity?.(item.id)}
                          className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                        >
                          <span className="w-4 shrink-0 text-[10px] tabular-nums text-zinc-600">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium text-zinc-300 transition-colors group-hover:text-white">
                              {item.label}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                              {item.course_name}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">
                            {item.minutes} min
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-[13px] font-medium text-zinc-200">Nenhum briefing ainda</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    Gere um resumo com prioridades, prazos e um plano de estudo para hoje.
                  </p>
                </div>
                <Button onClick={handleGenerateBriefing} disabled={syncing} variant="accent" size="sm">
                  {syncing ? <CogSpinner size={13} className="text-ink-950" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Gerar briefing
                </Button>
              </div>
            )}
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[13px] font-medium text-zinc-200">Disciplinas</h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {courses.length} {courses.length === 1 ? "matéria conectada" : "matérias conectadas"}
                </p>
              </div>
              <button
                onClick={() => onNavigate("cursos")}
                className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-white"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BookOpen className="h-5 w-5 text-zinc-600" />
                <p className="text-xs text-zinc-500">Nenhuma disciplina sincronizada.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {courses.slice(0, 6).map((crs) => (
                  <button
                    type="button"
                    key={crs.id}
                    onClick={() => openChat(crs.id)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025] sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-white">
                        {crs.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {crs.teacher || "Docente IFNMG"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">
                      {crs.pending_activities || 0} pend.
                    </span>
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-accent" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
