"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  MessageCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";

interface ActivitiesViewProps {
  openActivity?: (activityId: string) => void;
}

export default function ActivitiesView({ openActivity }: ActivitiesViewProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const acts = await activitiesApi.list();
      setActivities(acts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleToggleStatus = async (e: React.MouseEvent, id: string, currentStatus: string) => {
    e.stopPropagation();
    const nextStatus = currentStatus === "submitted" ? "pending" : "submitted";
    try {
      await activitiesApi.updateStatus(id, nextStatus);
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
      );
    } catch {}
  };

  const effectiveStatus = (act: any) => {
    if (
      act.status === "late" ||
      (act.status === "pending" && act.due_date && new Date(act.due_date) < new Date())
    ) {
      return "late";
    }
    return act.status;
  };

  // Ordem definida para leitura rápida: pendentes, entregues e atrasadas.
  const statusOrder: Record<string, number> = { pending: 0, submitted: 1, late: 2 };
  const sortedActivities = [...activities].sort((a, b) => {
    const statusDifference =
      (statusOrder[effectiveStatus(a)] ?? 3) - (statusOrder[effectiveStatus(b)] ?? 3);
    if (statusDifference !== 0) return statusDifference;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return <HelpCircle className="w-4 h-4 text-purple-400" />;
      case "forum":
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-indigo-400" /> Atividades & Tarefas
          </h1>
          <p className="text-sm text-gray-400">
            Clique em qualquer atividade para ler as orientações e estudar com IA direto no app
          </p>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Carregando atividades...</div>
        ) : sortedActivities.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#181826] border border-white/10 text-center text-gray-400 text-sm">
            Nenhuma atividade encontrada no Virtual2.
          </div>
        ) : (
          sortedActivities.map((act) => {
            const isLate = effectiveStatus(act) === "late";
            const isSubmitted = act.status === "submitted";

            return (
              <div
                key={act.id}
                onClick={() => openActivity && openActivity(act.id)}
                className="bg-[#181826] border border-white/10 hover:border-indigo-500/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition cursor-pointer group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={(e) => handleToggleStatus(e, act.id, act.status)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                      isSubmitted
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "border-white/20 hover:border-indigo-500 bg-white/5"
                    }`}
                    title={isSubmitted ? "Marcar como pendente" : "Marcar como entregue"}
                  >
                    {isSubmitted && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="inline-flex max-w-full items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold"
                        style={{
                          color: act.course_color || "#a5b4fc",
                          borderColor: `${act.course_color || "#6366f1"}55`,
                          backgroundColor: `${act.course_color || "#6366f1"}18`,
                        }}
                      >
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                      <span className="text-[10px] text-gray-500">•</span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {act.course_name || "Geral"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded-md bg-white/5">{getTypeIcon(act.type)}</span>
                      <h3
                        className={`text-sm font-semibold text-white group-hover:text-indigo-300 transition ${
                          isSubmitted ? "line-through text-gray-500" : ""
                        }`}
                      >
                        <span className="text-indigo-300 font-medium mr-1.5">[{act.course_name || "Matéria"}]</span>
                        {act.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {act.due_date ? (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isLate ? "text-red-400" : isSubmitted ? "text-gray-500" : "text-amber-400"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Prazo:{" "}
                          {new Date(act.due_date).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-500">Sem prazo definido</span>
                      )}

                      {act.grade !== null && act.grade !== undefined && (
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Nota: {act.grade} {act.max_grade ? `/ ${act.max_grade}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 text-xs font-semibold text-indigo-300 transition">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ver no App</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
