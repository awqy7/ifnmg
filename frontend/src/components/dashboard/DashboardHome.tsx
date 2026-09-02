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
  RefreshCw,
  Zap,
  Target,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { briefingApi, dashboardApi } from "@/lib/api";
import Markdown from "@/components/Markdown";
import { CogSpinner } from "@/components/ui/CogSpinner";

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

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="card-enter rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[#141418] border border-[var(--border)] p-5 lg:p-6 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80 mb-1">
            {today}
          </p>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "estudante"}
          </h1>
          <p className="text-sm text-neutral-400 mt-1.5 max-w-lg leading-relaxed">
            {taskCount > 0 && (
              <span className="text-amber-300/90 font-medium">{taskCount} {taskCount === 1 ? "tarefa pendente" : "tarefas pendentes"}</span>
            )}
            {taskCount === 0 && "Nenhuma tarefa pendente no momento."}
          </p>
        </div>
        {/* Subtle ambient glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      </div>

      {dataError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-200">
          <span>{dataError}</span>
          <button type="button" onClick={loadData} className="shrink-0 font-semibold text-white hover:text-rose-100">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Academic pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Disciplinas", value: courseCount, icon: BookOpen, tone: "emerald" },
          { label: "Pendências", value: taskCount, icon: CheckCircle2, tone: "blue" },
          { label: "Próximas 24h", value: due24hCount, icon: Timer, tone: "amber" },
          { label: "Atrasadas", value: lateCount, icon: AlertTriangle, tone: "red" },
        ].map((metric, index) => {
          const Icon = metric.icon;
          const toneClasses: Record<string, string> = {
            emerald: "text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/[0.12]",
            blue: "text-sky-400 bg-sky-500/[0.08] border-sky-500/[0.12]",
            amber: "text-amber-400 bg-amber-500/[0.08] border-amber-500/[0.12]",
            red: "text-rose-400 bg-rose-500/[0.08] border-rose-500/[0.12]",
          };
          return (
            <div key={metric.label} className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3.5 sm:p-4 flex items-center gap-3" style={{ animationDelay: `${40 + index * 35}ms` }}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${toneClasses[metric.tone]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight text-white leading-none">{loadingBriefing ? "—" : metric.value}</p>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1 truncate">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Briefing */}
      <div>
        {/* AI Daily Briefing */}
        <div className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.12]">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Briefing do Dia</h2>
                <p className="text-[11px] text-neutral-500">
                  {syncing ? "Atualizando dados em segundo plano" : "Prioridades, prazos e plano de estudo"}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateBriefing}
              disabled={generatingBriefing || syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border)] text-[11px] font-medium text-neutral-300 transition disabled:opacity-40"
            >
              {generatingBriefing ? (
                <>
                  <CogSpinner size={14} className="text-emerald-400" />
                  <span>Gerando</span>
                </>
              ) : syncing ? (
                <>
                  <CogSpinner size={12} className="text-neutral-400" />
                  <span>Sincronizando</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-neutral-500" />
                  <span>Atualizar</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-sm text-neutral-300 leading-relaxed min-h-[120px]">
            {loadingBriefing ? (
              <div className="flex items-center justify-center h-28">
                <CogSpinner size={18} className="text-neutral-500" />
              </div>
            ) : briefing ? (
              <div className="space-y-4">
                {briefing.top_priority && (
                  <button
                    onClick={() => openActivity?.(briefing.top_priority.id)}
                    className={`w-full text-left rounded-2xl border p-4 sm:p-5 relative overflow-hidden group transition-all ${
                      briefing.top_priority.status === "late"
                        ? "bg-gradient-to-br from-rose-500/[0.10] to-transparent border-rose-500/20 hover:border-rose-400/35"
                        : "bg-gradient-to-br from-emerald-500/[0.10] to-transparent border-emerald-500/20 hover:border-emerald-400/35"
                    }`}
                  >
                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className={`w-4 h-4 ${briefing.top_priority.status === "late" ? "text-rose-400" : "text-emerald-400"}`} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Foco principal</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${briefing.top_priority.status === "late" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                            {briefing.top_priority.status === "late" ? "Atrasada" : "Prioridade"}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-white line-clamp-2 group-hover:text-emerald-100 transition-colors">
                          {briefing.top_priority.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">{briefing.top_priority.course_name}</p>
                        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-neutral-300">
                          <Timer className="w-3.5 h-3.5 text-neutral-500" />
                          {formatDeadline(briefing.top_priority.due_date)}
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <ArrowRight className="w-4 h-4 text-neutral-300" />
                      </div>
                    </div>
                    <div className="absolute -right-12 -bottom-16 w-40 h-40 bg-emerald-400/[0.06] blur-3xl rounded-full" />
                  </button>
                )}

                <div className="rounded-xl bg-white/[0.025] border border-[var(--border)] p-3.5 text-[13px] text-neutral-300 leading-6">
                  <Markdown content={briefing.content} />
                </div>

                {briefing.awaiting_confirmation?.length > 0 && (
                  <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.05] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-sky-300">Aguardando confirmação do Virtual2</p>
                        <p className="mt-0.5 text-[10px] text-sky-300/55">
                          {briefing.awaiting_confirmation.length} {briefing.awaiting_confirmation.length === 1 ? "entrega informada por você" : "entregas informadas por você"}
                        </p>
                      </div>
                      <button type="button" onClick={() => onNavigate("atividades")} className="text-[10px] font-semibold text-sky-300 hover:text-white">Ver atividades</button>
                    </div>
                  </div>
                )}

                {briefing.study_plan?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Plano recomendado</h3>
                      <span className="text-[10px] text-neutral-600">
                        {briefing.study_plan.reduce((total: number, item: any) => total + item.minutes, 0)} min
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {briefing.study_plan.map((item: any, index: number) => (
                        <button
                          key={`${item.id}-${index}`}
                          onClick={() => openActivity?.(item.id)}
                          className="rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-[var(--border)] p-3 text-left transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/[0.10] text-emerald-400 text-[10px] font-bold flex items-center justify-center">{index + 1}</span>
                            <span className="text-[9px] text-neutral-500">{item.minutes} min</span>
                          </div>
                          <p className="text-[11px] font-medium text-neutral-200 line-clamp-2 leading-relaxed">{item.label}</p>
                          <p className="text-[9px] text-neutral-600 mt-1 truncate">{item.course_name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--border)] text-center flex flex-col items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-400/60" />
                <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                  Gere seu briefing diário para ver prioridades e prazos.
                </p>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={syncing}
                  className="px-4 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-white text-xs font-semibold transition disabled:opacity-40"
                >
                  {syncing ? <CogSpinner size={14} className="text-white" /> : "Gerar Briefing"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Activities + Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Activities */}
        <div className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.1]">
                <AlertTriangle className="w-4 h-4 text-amber-400/80" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Tarefas Pendentes</h2>
                <p className="text-[11px] text-neutral-500">{taskCount} {taskCount === 1 ? "entrega" : "entregas"} pendente{taskCount !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("atividades")}
              className="text-[11px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-0.5 font-medium transition"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {pendingActivities.length === 0 ? (
              <div className="p-5 text-center text-neutral-500 text-xs">
                Nenhuma tarefa pendente. Tudo em dia.
              </div>
            ) : (
              pendingActivities.slice(0, 5).map((act) => (
                <button
                  type="button"
                  key={act.id}
                  onClick={() => openActivity && openActivity(act.id)}
                  className="w-full p-3 text-left rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.15] hover:bg-white/[0.04] flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1">
                      <span className="inline-flex items-center rounded-md border border-emerald-500/[0.12] bg-emerald-500/[0.05] px-2 py-0.5 text-[10px] font-medium text-emerald-400/80">
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-neutral-200 group-hover:text-emerald-300/90 transition-colors truncate">
                      {act.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">
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
                  <span className="text-[9px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-md bg-amber-500/[0.06] text-amber-400/70 border border-amber-500/[0.1] shrink-0">
                    {act.type}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
                <BookOpen className="w-4 h-4 text-emerald-400/80" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Disciplinas</h2>
                <p className="text-[11px] text-neutral-500">{courses.length} materias conectadas</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("cursos")}
              className="text-[11px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-0.5 font-medium transition"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto">
            {courses.length === 0 ? (
              <div className="col-span-2 p-5 text-center text-neutral-500 text-xs">
                Nenhuma disciplina sincronizada.
              </div>
            ) : (
              courses.slice(0, 6).map((crs) => (
                <button
                  type="button"
                  key={crs.id}
                  onClick={() => openChat(crs.id)}
                  className="p-3.5 text-left rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.15] hover:bg-white/[0.04] transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-medium text-neutral-200 group-hover:text-emerald-300/90 transition-colors line-clamp-1">
                      {crs.name}
                    </h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                      {crs.teacher || "Docente IFNMG"}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className="text-neutral-500">{crs.pending_activities || 0} pendentes</span>
                    <span className="flex items-center gap-0.5 font-medium text-emerald-400/70 group-hover:text-emerald-300 transition-colors">
                      Chat <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
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
