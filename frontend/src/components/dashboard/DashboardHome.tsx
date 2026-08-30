"use client";

import { useEffect, useState, useRef } from "react";
import { ViewType } from "./Dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import {
  Sparkles,
  Clock,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { briefingApi, scheduleApi, activitiesApi, coursesApi } from "@/lib/api";
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
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any>({ day: "", slots: [] });
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const initialSyncDone = useRef(false);

  const loadData = async () => {
    try {
      const [briefingData, schedData, acts, crs] = await Promise.allSettled([
        briefingApi.getToday(),
        scheduleApi.getToday(),
        activitiesApi.list({ status: "pending" }),
        coursesApi.list(),
      ]);

      if (briefingData.status === "fulfilled") {
        setBriefing(briefingData.value.content);
      }
      if (schedData.status === "fulfilled") {
        setTodaySchedule(schedData.value);
      }
      if (acts.status === "fulfilled") {
        setPendingActivities(acts.value);
      }
      if (crs.status === "fulfilled") {
        setCourses(crs.value);
      }
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    if (!syncing) {
      if (!initialSyncDone.current) {
        initialSyncDone.current = true;
        loadData();
      }
    }
  }, [syncing]);

  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener("data-refresh", handleRefresh);
    return () => window.removeEventListener("data-refresh", handleRefresh);
  }, []);

  const handleGenerateBriefing = async () => {
    if (syncing || generatingBriefing) return;
    setGeneratingBriefing(true);
    try {
      const res: any = await briefingApi.generate();
      if (res && res.content) {
        setBriefing(res.content);
      } else {
        const today = await briefingApi.getToday();
        setBriefing(today.content);
      }
    } catch {
      // ignore
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

  const classCount = todaySchedule.slots?.length || 0;
  const taskCount = pendingActivities.length;

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
            {classCount > 0 && (
              <>
                <span className="text-neutral-200 font-medium">{classCount} {classCount === 1 ? "aula" : "aulas"} hoje</span>
                {taskCount > 0 && " · "}
              </>
            )}
            {taskCount > 0 && (
              <span className="text-amber-300/90 font-medium">{taskCount} {taskCount === 1 ? "tarefa pendente" : "tarefas pendentes"}</span>
            )}
            {classCount === 0 && taskCount === 0 && "Nenhuma aula ou tarefa pendente no momento."}
          </p>
        </div>
        {/* Subtle ambient glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Briefing + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Daily Briefing */}
        <div className="card-enter lg:col-span-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.12]">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Briefing do Dia</h2>
                <p className="text-[11px] text-neutral-500">Resumo de prioridades e prazos</p>
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

          <div className="mt-3 text-sm text-neutral-300 leading-relaxed min-h-[120px]">
            {syncing ? (
              <div className="flex items-center justify-center h-28">
                <CogSpinner size={20} className="text-emerald-400" />
              </div>
            ) : loadingBriefing ? (
              <div className="flex items-center justify-center h-28">
                <CogSpinner size={18} className="text-neutral-500" />
              </div>
            ) : briefing ? (
              <div className="max-w-none text-neutral-300">
                <Markdown content={briefing} />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--border)] text-center flex flex-col items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-400/60" />
                <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                  Gere seu briefing diario para ver prioridades e prazos.
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

        {/* Today's Classes */}
        <div className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/[0.04] border border-[var(--border)]">
                <Clock className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Aulas de Hoje</h2>
                <p className="text-[11px] text-neutral-500">{todaySchedule.day || "Hoje"}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("horarios")}
              className="text-[11px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-0.5 font-medium transition"
            >
              Grade <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {!todaySchedule.slots || todaySchedule.slots.length === 0 ? (
              <div className="p-5 text-center text-neutral-500 text-xs leading-relaxed">
                Sem aulas presenciais hoje.
              </div>
            ) : (
              todaySchedule.slots.map((slot: any) => (
                <div
                  key={slot.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center justify-between gap-2 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-neutral-200 truncate">{slot.course_name}</h4>
                    <p className="text-[10px] text-neutral-500">{slot.room || "Sala padrao"}</p>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-500/[0.06] text-emerald-400/80 border border-emerald-500/[0.1] shrink-0">
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
              ))
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
                <div
                  key={act.id}
                  onClick={() => openActivity && openActivity(act.id)}
                  className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.15] hover:bg-white/[0.04] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
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
                </div>
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
                <div
                  key={crs.id}
                  onClick={() => openChat(crs.id)}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.15] hover:bg-white/[0.04] transition-colors cursor-pointer flex flex-col justify-between group"
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
