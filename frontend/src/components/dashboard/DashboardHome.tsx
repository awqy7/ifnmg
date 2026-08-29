"use client";

import { useEffect, useState } from "react";
import { ViewType } from "./Dashboard";
import { useAuth } from "@/contexts/AuthContext";
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

interface DashboardHomeProps {
  onNavigate: (view: ViewType) => void;
  openChat: (courseId?: string) => void;
  openActivity?: (activityId: string) => void;
}

export default function DashboardHome({ onNavigate, openChat, openActivity }: DashboardHomeProps) {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any>({ day: "", slots: [] });
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

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
    loadData();
  }, []);

  const handleGenerateBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      await briefingApi.generate();
      setTimeout(async () => {
        const res = await briefingApi.getToday();
        setBriefing(res.content);
        setGeneratingBriefing(false);
      }, 4000);
    } catch {
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-white/10 p-6 lg:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
              {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Estudante"}! 👋
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-xl">
              Seu painel acadêmico integrado está sincronizado. Você tem{" "}
              <strong className="text-indigo-300 font-semibold">{todaySchedule.slots?.length || 0} aulas hoje</strong> e{" "}
              <strong className="text-amber-300 font-semibold">{pendingActivities.length} atividades pendentes</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openChat()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Estudar com IA
            </button>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid: Briefing IA & Today Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IA Daily Briefing (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#181826] border border-white/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Briefing Matinal da IA</h2>
                  <p className="text-xs text-gray-400">Resumo personalizado do seu dia acadêmico</p>
                </div>
              </div>
              <button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingBriefing ? "animate-spin text-indigo-400" : ""}`} />
                <span>{generatingBriefing ? "Gerando..." : "Regerar"}</span>
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-300 leading-relaxed min-h-[140px] whitespace-pre-line">
              {loadingBriefing ? (
                <div className="flex items-center justify-center h-32 gap-2 text-gray-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Carregando briefing diário...
                </div>
              ) : briefing ? (
                <div className="max-w-none text-gray-300">
                  <Markdown content={briefing} />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                  <p>O briefing de hoje ainda não foi gerado.</p>
                  <button
                    onClick={handleGenerateBriefing}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition"
                  >
                    Gerar Briefing Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Classes (1 col) */}
        <div className="rounded-3xl bg-[#181826] border border-white/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Aulas de Hoje</h2>
                  <p className="text-xs text-gray-400">{todaySchedule.day || "Hoje"}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate("horarios")}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                Grade <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto">
              {!todaySchedule.slots || todaySchedule.slots.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs">
                  Nenhuma aula agendada para hoje! 🎉
                </div>
              ) : (
                todaySchedule.slots.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 hover:bg-white/10 transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{slot.course_name}</h4>
                      <p className="text-[11px] text-gray-400">{slot.room || "Sala padrão"}</p>
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
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
        <div className="rounded-3xl bg-[#181826] border border-white/10 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Próximos Prazos & Entregas</h2>
                <p className="text-xs text-gray-400">{pendingActivities.length} pendências</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("atividades")}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto">
            {pendingActivities.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">
                Tudo em dia! Nenhuma atividade pendente. 🚀
              </div>
            ) : (
              pendingActivities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  onClick={() => openActivity && openActivity(act.id)}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 flex items-center justify-between gap-3 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <span className="inline-flex items-center rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition truncate">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {act.due_date ? `Vence em: ${new Date(act.due_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Sem data limite"}
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
        <div className="rounded-3xl bg-[#181826] border border-white/10 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Minhas Disciplinas</h2>
                <p className="text-xs text-gray-400">{courses.length} matriculadas</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("cursos")}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Ver matérias <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
            {courses.length === 0 ? (
              <div className="col-span-2 p-6 text-center text-gray-500 text-xs">
                Nenhuma disciplina sincronizada ainda.
              </div>
            ) : (
              courses.slice(0, 6).map((crs) => (
                <div
                  key={crs.id}
                  onClick={() => openChat(crs.id)}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition line-clamp-1">
                      {crs.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                      {crs.teacher || "Professor IFNMG"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-400">
                    <span>{crs.pending_activities || 0} pendentes</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold">
                      Chat <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
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
