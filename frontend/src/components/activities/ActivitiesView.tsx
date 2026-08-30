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
import { CogSpinner } from "@/components/ui/CogSpinner";

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
        return <HelpCircle className="w-3.5 h-3.5 text-emerald-400/80" />;
      case "forum":
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-400/80" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-emerald-400/80" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <CheckSquare className="w-5 h-5 text-emerald-400/80" />
          Atividades
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Acompanhe suas entregas e prazos
        </p>
      </div>

      {/* Activities List */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <CogSpinner size={32} className="text-neutral-600" />
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-neutral-500 text-sm">
            Nenhuma atividade encontrada.
          </div>
        ) : (
          sortedActivities.map((act) => {
            const isLate = effectiveStatus(act) === "late";
            const isSubmitted = act.status === "submitted";

            return (
              <div
                key={act.id}
                onClick={() => openActivity && openActivity(act.id)}
                className="bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/[0.12] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={(e) => handleToggleStatus(e, act.id, act.status)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      isSubmitted
                        ? "bg-emerald-500 border-emerald-500 text-black"
                        : "border-neutral-700 hover:border-emerald-500/50 bg-white/[0.02]"
                    }`}
                    title={isSubmitted ? "Marcar como pendente" : "Marcar como entregue"}
                  >
                    {isSubmitted && <CheckCircle2 className="w-3 h-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1">
                      <span className="inline-flex max-w-full items-center rounded-md border border-emerald-500/[0.12] bg-emerald-500/[0.05] px-2 py-0.5 text-[10px] font-medium text-emerald-400/80">
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="p-0.5 rounded bg-white/[0.02]">{getTypeIcon(act.type)}</span>
                      <h3
                        className={`text-xs font-medium text-neutral-200 group-hover:text-emerald-300/90 transition-colors ${
                          isSubmitted ? "line-through text-neutral-600" : ""
                        }`}
                      >
                        {act.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 flex-wrap">
                      {act.due_date ? (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isLate ? "text-red-400/80" : isSubmitted ? "text-neutral-600" : "text-amber-400/80"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {new Date(act.due_date).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-neutral-600">Sem prazo</span>
                      )}

                      {act.grade !== null && act.grade !== undefined && (
                        <span className="text-emerald-400/80 font-medium bg-emerald-500/[0.06] px-1.5 py-0.5 rounded border border-emerald-500/[0.1]">
                          {act.grade} {act.max_grade ? `/ ${act.max_grade}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-[var(--border)] text-[10px] font-medium text-neutral-400 transition-colors">
                    <Sparkles className="w-3 h-3 text-emerald-400/60" />
                    <span>Detalhes</span>
                    <ChevronRight className="w-3 h-3 text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
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
