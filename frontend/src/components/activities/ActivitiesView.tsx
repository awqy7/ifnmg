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
  Search,
  Inbox,
  ListFilter,
  Circle,
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

  const counts = {
    late: sortedActivities.filter((a) => effectiveStatus(a) === "late").length,
    pending: sortedActivities.filter((a) => effectiveStatus(a) === "pending").length,
    done: sortedActivities.filter((a) =>
      ["submitted", "manual_completed", "closed"].includes(a.status)
    ).length,
    all: sortedActivities.length,
  };

  const matchesFilter = (act: ActivityItem) => {
    if (filter === "late") return effectiveStatus(act) === "late";
    if (filter === "pending") return effectiveStatus(act) === "pending";
    if (filter === "done")
      return ["submitted", "manual_completed", "closed"].includes(act.status);
    return true;
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visible = sortedActivities.filter((act) => {
    if (!matchesFilter(act)) return false;
    if (!normalizedQuery) return true;
    return (
      act.title.toLowerCase().includes(normalizedQuery) ||
      (act.course_name || "").toLowerCase().includes(normalizedQuery)
    );
  });

  const groupDefinitions = [
    {
      key: "late",
      title: "Precisa de atenção",
      description: "Prazos vencidos ou urgentes",
      items: visible.filter((act) => effectiveStatus(act) === "late"),
    },
    {
      key: "pending",
      title: "Em aberto",
      description: "Entregas dentro do prazo",
      items: visible.filter((act) => effectiveStatus(act) === "pending"),
    },
    {
      key: "done",
      title: "Concluídas",
      description: "Confirmadas ou encerradas",
      items: visible.filter((act) =>
        ["submitted", "manual_completed", "closed"].includes(act.status)
      ),
    },
  ].filter((group) => group.items.length > 0);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: "Todas", count: counts.all },
    { key: "late", label: "Vencidas", count: counts.late },
    { key: "pending", label: "Pendentes", count: counts.pending },
    { key: "done", label: "Concluídas", count: counts.done },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      case "forum":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDeadline = (value: string) =>
    new Date(value).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent">
              <CheckSquare className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="eyebrow text-[9px]">Sua semana</p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Atividades<span className="text-accent">.</span>
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {counts.late > 0 ? (
              <span className="text-status-urgent">{counts.late} {counts.late === 1 ? "vencida" : "vencidas"}</span>
            ) : (
              <span className="text-accent">Nenhuma vencida</span>
            )}
            {" · "}
            {counts.pending} pendentes · {counts.done} concluídas
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título ou disciplina"
            aria-label="Buscar atividades"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </header>

      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 hidden items-center gap-1 text-[10px] font-semibold text-zinc-600 sm:flex">
            <ListFilter className="h-3.5 w-3.5" />
          </span>
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                  active
                    ? "border-accent/30 bg-accent/[0.1] text-accent"
                    : "border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 py-px text-[9px] ${
                    active ? "bg-accent/15 text-accent" : "bg-white/[0.05] text-zinc-600"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[9px] text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Sincronizado com o Virtual2
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.07] px-4 py-3 text-xs text-status-urgent"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={loadActivities} className="shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="panel flex items-center gap-3 p-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.05]" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-white">
              {query ? "Nada encontrado para essa busca" : "Nenhuma atividade por aqui"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {query
                ? "Tente outro termo ou limpe a busca."
                : "Quando o Virtual2 trouxer novas tarefas, elas aparecem aqui."}
            </p>
          </div>
          {query && (
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupDefinitions.map((group) => (
            <section key={group.key}>
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    group.key === "late"
                      ? "bg-status-urgent"
                      : group.key === "pending"
                      ? "bg-status-warning"
                      : "bg-accent"
                  }`}
                />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  {group.title}
                </h2>
                <span className="rounded-full bg-white/[0.05] px-1.5 py-px text-[9px] font-semibold text-zinc-600">
                  {group.items.length}
                </span>
                <span className="hidden text-[9px] text-zinc-700 sm:inline">
                  · {group.description}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((act) => {
                  const status = effectiveStatus(act);
                  const isLate = status === "late";
                  const isSubmitted = act.status === "submitted";
                  const isManualCompleted = act.status === "manual_completed";
                  const isClosed = act.status === "closed";
                  const isDone = isSubmitted || isManualCompleted || isClosed;

                  return (
                    <article
                      key={act.id}
                      onClick={() => openActivity?.(act.id)}
                      className={`group panel relative cursor-pointer overflow-hidden p-3.5 transition-all hover:-translate-y-px sm:p-4 ${
                        isLate && !isDone
                          ? "border-status-urgent/20 hover:border-status-urgent/40"
                          : isDone
                          ? "hover:border-accent/20"
                          : "hover:border-white/15"
                      }`}
                    >
                      {isLate && !isDone && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-status-urgent" />
                      )}

                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={isSubmitted || isClosed}
                          onClick={(e) => handleToggleStatus(e, act)}
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSubmitted || isClosed
                              ? "border-accent/40 bg-accent text-ink-950"
                              : isManualCompleted
                              ? "border-status-info/50 bg-status-info/20 text-status-info"
                              : isLate
                              ? "border-status-urgent/50 text-transparent hover:border-status-urgent hover:bg-status-urgent/10"
                              : "border-white/20 text-transparent hover:border-accent hover:bg-accent/10"
                          }`}
                          title={
                            isSubmitted
                              ? "Entrega confirmada pelo Virtual2"
                              : isClosed
                              ? "Atividade encerrada"
                              : isManualCompleted
                              ? "Remover confirmação manual"
                              : "Marcar como entregue"
                          }
                          aria-label={
                            isSubmitted
                              ? "Entrega confirmada pelo Virtual2"
                              : isClosed
                              ? "Atividade encerrada"
                              : isManualCompleted
                              ? "Remover confirmação manual"
                              : "Marcar como entregue"
                          }
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Circle className="h-2.5 w-2.5 opacity-0" />
                          )}
                        </button>

                        <span
                          className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex ${
                            isLate && !isDone
                              ? "border-status-urgent/20 bg-status-urgent/[0.07] text-status-urgent"
                              : isDone
                              ? "border-white/[0.06] bg-white/[0.03] text-zinc-600"
                              : "border-white/[0.06] bg-white/[0.03] text-zinc-400"
                          }`}
                        >
                          {getTypeIcon(act.type)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="max-w-full truncate rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                              {act.course_name || "Disciplina"}
                            </span>
                            <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-zinc-600">
                              {act.type}
                            </span>
                            {act.is_group_activity && (
                              <span className="flex items-center gap-1 rounded-md bg-status-info/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-status-info">
                                <Users className="h-2.5 w-2.5" /> Grupo
                              </span>
                            )}
                          </div>

                          <h3
                            className={`mt-1.5 text-[13px] font-semibold leading-snug transition-colors group-hover:text-accent-light ${
                              isDone && !isManualCompleted ? "text-zinc-500 line-through" : "text-zinc-100"
                            }`}
                          >
                            {act.title}
                          </h3>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                            {isLate && !isDone && (
                              <span className="flex items-center gap-1 font-semibold text-status-urgent">
                                <AlertCircle className="h-3 w-3" /> Vencida
                              </span>
                            )}
                            {isManualCompleted && (
                              <span className="flex items-center gap-1 font-medium text-status-info">
                                <Users className="h-3 w-3" /> Grupo entregou
                              </span>
                            )}
                            {isSubmitted && (
                              <span className="flex items-center gap-1 font-medium text-accent">
                                <CheckCircle2 className="h-3 w-3" /> Confirmado pelo Virtual2
                              </span>
                            )}
                            {isClosed && (
                              <span className="flex items-center gap-1 text-zinc-600">Encerrada</span>
                            )}
                            {act.due_date ? (
                              <span
                                className={`flex items-center gap-1 font-medium ${
                                  isLate && !isDone
                                    ? "text-status-urgent"
                                    : isDone
                                    ? "text-zinc-600"
                                    : "text-status-warning"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {formatDeadline(act.due_date)}
                              </span>
                            ) : (
                              <span className="text-zinc-600">Sem prazo</span>
                            )}
                          </div>
                        </div>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-600 transition-all group-hover:border-accent/25 group-hover:bg-accent/[0.06] group-hover:text-accent">
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

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
