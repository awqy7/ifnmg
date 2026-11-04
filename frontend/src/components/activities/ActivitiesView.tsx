"use client";

import { useState, useEffect } from "react";
import { Glass, SegmentedControl, SearchField } from "glisse";
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
  Inbox,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
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

type FilterKey = "all" | "late" | "pending" | "done";

export default function ActivitiesView({ openActivity }: ActivitiesViewProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForCompletion, setSelectedForCompletion] = useState<ActivityItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

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

  const getStatusBadge = (activity: ActivityItem) => {
    if (activity.status === "submitted") {
      return (
        <span className="chip border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Virtual2: Entregue
        </span>
      );
    }
    if (activity.status === "manual_completed") {
      return (
        <span className="chip border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Concluída
        </span>
      );
    }
    if (activity.status === "late") {
      return (
        <span className="chip border-rose-500/30 bg-rose-500/10 text-rose-300">
          <AlertTriangle className="h-3 w-3 text-rose-400" />
          Atrasada
        </span>
      );
    }
    return (
      <span className="chip border-amber-400/30 bg-amber-500/10 text-amber-300">
        <Clock className="h-3 w-3 text-amber-400" />
        Pendente
      </span>
    );
  };

  const filteredActivities = activities
    .filter((act) => {
      if (filter === "late") return act.status === "late";
      if (filter === "pending") return act.status === "pending";
      if (filter === "done")
        return act.status === "submitted" || act.status === "manual_completed";
      return true;
    })
    .filter((act) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        (act.course_name && act.course_name.toLowerCase().includes(q)) ||
        (act.type && act.type.toLowerCase().includes(q))
      );
    });

  const counts = {
    all: activities.length,
    late: activities.filter((a) => a.status === "late").length,
    pending: activities.filter((a) => a.status === "pending").length,
    done: activities.filter(
      (a) => a.status === "submitted" || a.status === "manual_completed"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header com Controles em Glass */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Atividades & Prazos
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Gerencie suas entregas, sincronizadas automaticamente com o Virtual2 Moodle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={loadActivities}
            className="border-white/15 text-zinc-200 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
            Recarregar
          </Button>
        </div>
      </div>

      {error && (
        <Glass
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300"
        >
          <span>{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={loadActivities} className="text-rose-200">
            Tentar novamente
          </Button>
        </Glass>
      )}

      {/* Barra de Filtros com SegmentedControl e SearchField do Glisse */}
      <Glass className="flex flex-col gap-4 p-4 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            items={[
              { value: "all", label: `Todas (${counts.all})` },
              { value: "pending", label: `Pendentes (${counts.pending})` },
              { value: "late", label: `Atrasadas (${counts.late})` },
              { value: "done", label: `Concluídas (${counts.done})` },
            ]}
            value={filter}
            onValueChange={(val) => setFilter(val as FilterKey)}
          />
        </div>

        <div className="w-full sm:w-72">
          <SearchField
            placeholder="Buscar por título ou matéria..."
            value={query}
            onValueChange={setQuery}
          />
        </div>
      </Glass>

      {/* Lista de Atividades em Glass Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Glass key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Glass className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Inbox className="h-10 w-10 text-zinc-500" />
          <h3 className="font-display text-base font-semibold text-white">Nenhuma atividade encontrada</h3>
          <p className="max-w-xs text-xs text-zinc-400">
            Não há tarefas correspondentes ao filtro ou busca selecionada.
          </p>
        </Glass>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const isDone = act.status === "submitted" || act.status === "manual_completed";
            return (
              <Glass
                key={act.id}
                onClick={() => openActivity?.(act.id)}
                className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-white/[0.07] hover:shadow-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Botão de Toggle de Conclusão Rápida */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleStatus(e, act)}
                    disabled={act.status === "submitted"}
                    title={act.status === "submitted" ? "Entregue no Moodle" : "Marcar como concluída"}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                      isDone
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(69,255,156,0.3)]"
                        : "border-white/20 bg-white/[0.05] text-transparent hover:border-emerald-400 hover:text-emerald-400/50"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-display text-sm font-bold text-white transition-colors group-hover:text-emerald-300 ${
                        isDone ? "line-through text-zinc-400" : ""
                      }`}>
                        {act.title}
                      </h3>
                      {act.is_group_activity && (
                        <span className="chip border-purple-400/30 bg-purple-500/10 text-purple-300">
                          <Users className="h-3 w-3" /> Em Grupo
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-300">{act.course_name}</span>
                      <span className="text-zinc-600">•</span>
                      <span>Tipo: {act.type}</span>
                      {act.due_date && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            act.status === "late" ? "text-rose-400" : "text-zinc-300"
                          }`}>
                            <Clock className="h-3 w-3" />
                            Prazo: {new Date(act.due_date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {getStatusBadge(act)}
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
                </div>
              </Glass>
            );
          })}
        </div>
      )}

      {selectedForCompletion && (
        <ManualCompletionDialog
          open={Boolean(selectedForCompletion)}
          activityTitle={selectedForCompletion.title}
          alreadyCompleted={selectedForCompletion.status === "manual_completed"}
          loading={updating}
          onClose={() => setSelectedForCompletion(null)}
          onConfirm={handleManualCompletion}
        />
      )}
    </div>
  );
}
