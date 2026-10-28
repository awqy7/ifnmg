"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  Users,
  AlertCircle,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
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
        return <HelpCircle className="w-3.5 h-3.5 text-[var(--ifnmblue)]/80" />;
      case "forum":
        return <MessageCircle className="w-3.5 h-3.5 text-[var(--ifnmblue)]/80" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-[var(--ifnmblue)]/80" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <CheckSquare className="w-5 h-5 text-[var(--ifnmblue)]/80" />
          <span className="text-gradient-accent">Atividades</span>
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
          {sortedActivities.filter((a) => effectiveStatus(a) === "late").length} vencidas · {sortedActivities.filter((a) => effectiveStatus(a) === "pending").length} pendentes
        </p>
      </div>

      {/* Activities List - Timeline style */}
      <div className="space-y-3">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-300/90">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
            <button type="button" onClick={loadActivities} className="font-semibold text-red-200 hover:text-white">Tentar novamente</button>
          </div>
        )}
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <CogSpinner size={32} className="text-[var(--text-muted)]" />
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-[var(--text-secondary)] text-sm">
            Nenhuma atividade encontrada.
          </div>
        ) : (
          <div className="timeline-divider pl-6 space-y-3">
            {sortedActivities.map((act) => {
              const isLate = effectiveStatus(act) === "late";
              const isSubmitted = act.status === "submitted";
              const isManualCompleted = act.status === "manual_completed";

              return (
                <div
                  key={act.id}
                  className="relative group"
                >
                  {/* Timeline node */}
                  <div className="absolute left-[-22px] top-5 w-3 h-3 rounded-full border-2 border-[var(--surface-hover)] bg-[var(--surface-elevated)] z-10" />

                  <div
                    className={`card-elevated overflow-hidden ${
                      isLate
                        ? "border-status-urgent/30"
                        : isSubmitted
                        ? "border-status-success/20"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="p-4 flex items-start gap-3">
                      <Button
                        type="button"
                        disabled={isSubmitted}
                        onClick={(e) => handleToggleStatus(e, act)}
                        variant={isSubmitted ? "default" : isManualCompleted ? "secondary" : "outline"}
                        size="icon"
                        className={`mt-0.5 w-5 h-5 rounded-md p-0 flex items-center justify-center shrink-0 ${
                          isSubmitted
                            ? "bg-status-success border-status-success text-black"
                            : isManualCompleted
                            ? "bg-sky-500/20 border-sky-400/60 text-sky-300"
                            : isLate
                            ? "border-status-urgent/50 hover:border-status-urgent bg-red-500/[0.04]"
                            : ""
                        }`}
                        title={
                          isSubmitted
                            ? "Entrega confirmada pelo Virtual2"
                            : isManualCompleted
                            ? "Remover confirmação manual"
                            : "Marcar como entregue"
                        }
                        aria-label={
                          isSubmitted
                            ? "Entrega confirmada pelo Virtual2"
                            : isManualCompleted
                            ? "Remover confirmação manual"
                            : "Marcar como entregue"
                        }
                      >
                        {(isSubmitted || isManualCompleted) && <CheckCircle2 className="w-3 h-3" />}
                      </Button>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5">
                          <span className="inline-flex max-w-full items-center rounded-md border border-[var(--ifnmblue)]/[0.12] bg-[var(--ifnmblue)]/[0.04] px-2 py-0.5 text-[10px] font-medium text-[var(--ifnmblue)]/80">
                            <span className="truncate">{act.course_name || "Disciplina"}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="p-0.5 rounded bg-[var(--surface-inset)]">{getTypeIcon(act.type)}</span>
                          <h3 className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openActivity?.(act.id)}
                              className={`text-left text-sm font-medium text-neutral-200 hover:text-[var(--ifnmblue)]/90 transition-colors ${
                                isSubmitted || isManualCompleted ? "line-through text-neutral-600" : ""
                              }`}
                            >
                              {act.title}
                            </button>
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)] flex-wrap">
                          {isLate && !isSubmitted && (
                            <span className="flex items-center gap-1 font-medium text-status-urgent">
                              <AlertCircle className="w-3 h-3" /> Vencida
                            </span>
                          )}
                          {isManualCompleted && (
                            <span className="flex items-center gap-1 font-medium text-sky-400/80">
                              <Users className="w-3 h-3" /> Grupo entregou
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="flex items-center gap-1 font-medium text-status-success">
                              <CheckCircle2 className="w-3 h-3" /> Confirmado pelo Virtual2
                            </span>
                          )}
                          {act.due_date ? (
                            <span
                              className={`flex items-center gap-1 font-medium ${
                                isLate && !isSubmitted
                                  ? "text-status-urgent"
                                  : isSubmitted
                                  ? "text-neutral-600"
                                  : "text-status-warning"
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
                            <span className="text-[var(--text-muted)]">Sem prazo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 self-start ml-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => openActivity?.(act.id)}
                          title="Detalhes"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
