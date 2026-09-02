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
  Users,
  AlertCircle,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import ManualCompletionDialog, { ManualCompletionReason } from "./ManualCompletionDialog";

interface ActivitiesViewProps {
  openActivity?: (activityId: string) => void;
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  course_name: string;
  due_date: string | null;
  status: "pending" | "late" | "manual_completed" | "submitted" | "closed";
  status_source?: "none" | "manual" | "moodle";
  is_group_activity?: boolean;
}

export default function ActivitiesView({ openActivity }: ActivitiesViewProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForCompletion, setSelectedForCompletion] = useState<ActivityItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const acts = await activitiesApi.list();
      setActivities(acts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as atividades.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadActivities();
    const refresh = () => loadActivities();
    window.addEventListener("activity-status-changed", refresh);
    window.addEventListener("data-refresh", refresh);
    return () => {
      window.removeEventListener("activity-status-changed", refresh);
      window.removeEventListener("data-refresh", refresh);
    };
  }, []);

  const handleToggleStatus = (e: React.MouseEvent, activity: ActivityItem) => {
    e.stopPropagation();
    if (activity.status === "submitted") return;
    setSelectedForCompletion(activity);
  };

  const handleManualCompletion = async (
    completed: boolean,
    reason: ManualCompletionReason,
    note?: string
  ) => {
    if (!selectedForCompletion) return;
    setUpdating(true);
    try {
      const result = await activitiesApi.updateManualCompletion(
        selectedForCompletion.id,
        completed,
        reason,
        note
      );
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === selectedForCompletion.id ? { ...activity, ...result } : activity
        )
      );
      setSelectedForCompletion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a atividade.");
    } finally {
      setUpdating(false);
    }
  };

  const effectiveStatus = (act: ActivityItem) => {
    if (
      act.status === "late" ||
      (act.status === "pending" && act.due_date && new Date(act.due_date) < new Date())
    ) {
      return "late";
    }
    return act.status;
  };

  const statusOrder: Record<string, number> = {
    late: 0,
    pending: 1,
    manual_completed: 2,
    submitted: 3,
    closed: 4,
  };
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
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-300/90">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
            <button type="button" onClick={loadActivities} className="font-semibold text-red-200 hover:text-white">Tentar novamente</button>
          </div>
        )}
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
            const isManualCompleted = act.status === "manual_completed";

            return (
              <div
                key={act.id}
                className="bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/[0.12] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    disabled={isSubmitted}
                    onClick={(e) => handleToggleStatus(e, act)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      isSubmitted
                        ? "bg-emerald-500 border-emerald-500 text-black"
                        : isManualCompleted
                        ? "bg-sky-500/20 border-sky-400/60 text-sky-300"
                        : "border-neutral-700 hover:border-emerald-500/50 bg-white/[0.02]"
                    }`}
                    title={isSubmitted ? "Entrega confirmada pelo Virtual2" : isManualCompleted ? "Remover confirmação manual" : "Informar que o grupo entregou"}
                    aria-label={isSubmitted ? "Entrega confirmada pelo Virtual2" : isManualCompleted ? "Remover confirmação manual" : "Informar que o grupo entregou"}
                  >
                    {(isSubmitted || isManualCompleted) && <CheckCircle2 className="w-3 h-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1">
                      <span className="inline-flex max-w-full items-center rounded-md border border-emerald-500/[0.12] bg-emerald-500/[0.05] px-2 py-0.5 text-[10px] font-medium text-emerald-400/80">
                        <span className="truncate">{act.course_name || "Disciplina"}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="p-0.5 rounded bg-white/[0.02]">{getTypeIcon(act.type)}</span>
                      <h3 className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openActivity?.(act.id)}
                          className={`text-left text-xs font-medium text-neutral-200 hover:text-emerald-300/90 transition-colors ${
                            isSubmitted || isManualCompleted ? "line-through text-neutral-600" : ""
                          }`}
                        >
                          {act.title}
                        </button>
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 flex-wrap">
                      {isManualCompleted && (
                        <span className="flex items-center gap-1 font-medium text-sky-400/80">
                          <Users className="w-3 h-3" /> Grupo entregou · informado por você
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="flex items-center gap-1 font-medium text-emerald-400/80">
                          <CheckCircle2 className="w-3 h-3" /> Confirmado pelo Virtual2
                        </span>
                      )}
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button type="button" onClick={() => openActivity?.(act.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-[var(--border)] text-[10px] font-medium text-neutral-400 transition-colors">
                    <Sparkles className="w-3 h-3 text-emerald-400/60" />
                    <span>Detalhes</span>
                    <ChevronRight className="w-3 h-3 text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ManualCompletionDialog
        open={Boolean(selectedForCompletion)}
        activityTitle={selectedForCompletion?.title || "Atividade"}
        alreadyCompleted={selectedForCompletion?.status === "manual_completed"}
        loading={updating}
        onClose={() => !updating && setSelectedForCompletion(null)}
        onConfirm={handleManualCompletion}
      />
    </div>
  );
}
