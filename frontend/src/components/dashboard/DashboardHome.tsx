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
  // Controle para não carregar dados enquanto a sincronização inicial está ativa
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

  // Carrega dados no mount, mas SÓ depois que o sync inicial terminar
  useEffect(() => {
    if (!syncing) {
      // Se o sync já terminou (ou nunca começou), carrega imediatamente
      if (!initialSyncDone.current) {
        initialSyncDone.current = true;
        loadData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing]);

  // Recarrega dados quando o evento "data-refresh" é disparado pelo SyncContext
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener("data-refresh", handleRefresh);
    return () => window.removeEventListener("data-refresh", handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateBriefing = async () => {
    if (syncing || generatingBriefing) return;
    setGeneratingBriefing(true);
    try {
      await briefingApi.generate();
      // Aguarda o backend processar antes de buscar o resultado
      await new Promise((r) => setTimeout(r, 4000));
      const res = await briefingApi.getToday();
      setBriefing(res.content);
    } catch {
      // ignora silenciosamente
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121218] via-[#15151e] to-[#0c0c10] border border-white/10 p-6 lg:p-8 shadow-2xl shadow-black/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white mt-1.5 tracking-tight">
              {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Líder"}! 🚀
            </h1>
            <p className="text-sm text-zinc-300 mt-1.5 max-w-xl leading-relaxed">
              Consistência é o segredo de quem passa de primeira. Você tem{" "}
              <strong className="text-emerald-300 font-semibold">{todaySchedule.slots?.length || 0} aulas hoje</strong> e{" "}
              <strong className="text-amber-300 font-semibold">{pendingActivities.length} metas no radar</strong>. Domine o dia passo a passo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openChat()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/60 transition hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Estudar com Mentor IA
            </button>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid: Briefing IA & Today Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IA Daily Briefing (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#121217] border border-white/10 p-6 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Briefing Estratégico Diário</h2>
                  <p className="text-xs text-zinc-400">Direcionamento de prioridades, prazos fatais e conceito-chave para dominar</p>
                </div>
              </div>
              <button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing || syncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-emerald-500/30 border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-50"
              >
                {generatingBriefing ? (
                  <>
                    <CogSpinner size={16} className="text-emerald-400" />
                    <span>Calculando...</span>
                  </>
                ) : syncing ? (
                  <>
                    <CogSpinner size={14} className="text-amber-400" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Atualizar Briefing</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-sm text-zinc-300 leading-relaxed min-h-[140px] whitespace-pre-line">
              {syncing ? (
                // Durante o sync: mostra somente o spinner, sem texto de "carregando"
                <div className="flex items-center justify-center h-32">
                  <CogSpinner size={24} className="text-emerald-400" />
                </div>
              ) : loadingBriefing ? (
                <div className="flex items-center justify-center h-32">
                  <CogSpinner size={20} className="text-white" />
                </div>
              ) : briefing ? (
                <div className="max-w-none text-zinc-200">
                  <Markdown content={briefing} />
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-zinc-400 text-xs flex flex-col items-center gap-3">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                  <p className="max-w-md text-zinc-300 leading-relaxed">
                    Seu briefing de hoje ainda não foi montado. Gere agora para mapear prioridades, antecipar prazos e destravar seu estudo.
                  </p>
                  <button
                    onClick={handleGenerateBriefing}
                    disabled={syncing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition disabled:opacity-50"
                  >
                    {syncing ? (
                      <CogSpinner size={14} className="text-white" />
                    ) : (
                      "Gerar Plano Estratégico Agora"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Classes (1 col) */}
        <div className="rounded-3xl bg-[#121217] border border-white/10 p-6 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Aulas de Hoje</h2>
                  <p className="text-xs text-zinc-400">{todaySchedule.day || "Hoje"}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate("horarios")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Grade Completa <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto">
              {!todaySchedule.slots || todaySchedule.slots.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs leading-relaxed">
                  Sem aulas presenciais hoje! Use esse tempo livre para zerar tarefas e adiantar matérias difíceis. 🎯
                </div>
              ) : (
                todaySchedule.slots.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 hover:bg-white/[0.06] transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{slot.course_name}</h4>
                      <p className="text-[11px] text-zinc-400">{slot.room || "Sala padrão"}</p>
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Pending Activities & Enrolled Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Activities */}
        <div className="rounded-3xl bg-[#121217] border border-white/10 p-6 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Missões Críticas & Prazos</h2>
                <p className="text-xs text-zinc-400">{pendingActivities.length} entregas requerem sua atenção</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("atividades")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Ver Todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto">
            {pendingActivities.length === 0 ? (
              <div className="p-6 text-center text-emerald-400/90 text-xs font-medium leading-relaxed">
                Excelente! Todas as suas atividades estão entregues e em dia. Continue nesse ritmo! 🏆
              </div>
            ) : (
              pendingActivities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  onClick={() => openActivity && openActivity(act.id)}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.06] flex items-center justify-between gap-3 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition truncate">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {act.due_date ? `Prazo fatal: ${new Date(act.due_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Sem data limite"}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                    {act.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Courses Grid */}
        <div className="rounded-3xl bg-[#121217] border border-white/10 p-6 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Disciplinas Ativas</h2>
                <p className="text-xs text-zinc-400">{courses.length} matérias conectadas ao Virtual2</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("cursos")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Ver Todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
            {courses.length === 0 ? (
              <div className="col-span-2 p-6 text-center text-zinc-400 text-xs">
                Nenhuma disciplina sincronizada ainda. Conecte ao Virtual2 para carregar suas matérias.
              </div>
            ) : (
              courses.slice(0, 6).map((crs) => (
                <div
                  key={crs.id}
                  onClick={() => openChat(crs.id)}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.06] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition line-clamp-1">
                      {crs.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                      {crs.teacher || "Docente IFNMG"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-400">
                    <span className="text-zinc-400">{crs.pending_activities || 0} pendentes</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 group-hover:text-emerald-200">
                      Mentor IA <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
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
