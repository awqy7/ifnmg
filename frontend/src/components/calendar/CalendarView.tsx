"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { calendarApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

interface CalendarViewProps {
  openActivity?: (activityId: string) => void;
}

export default function CalendarView({ openActivity }: CalendarViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await calendarApi.list();
      setEvents(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (filterType === "all") return true;
    if (filterType === "deadline") return ev.type === "activity_deadline";
    if (filterType === "event") return ev.type !== "activity_deadline";
    return true;
  });

  const handleEventClick = (ev: any) => {
    if (ev.type === "activity_deadline" && openActivity) {
      const actId = ev.id.replace("act_", "");
      openActivity(actId);
    } else if (ev.url) {
      window.open(ev.url, "_blank");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <CalendarIcon className="w-5 h-5 text-emerald-400/80" />
            Calendario
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Prazos, entregas e eventos academicos
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { key: "all", label: "Todos" },
            { key: "deadline", label: "Prazos" },
            { key: "event", label: "Eventos" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                filterType === key
                  ? "bg-emerald-500/[0.1] text-emerald-400/80 border border-emerald-500/[0.15]"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <CogSpinner size={32} className="text-neutral-600" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-neutral-500 text-sm">
          Nenhum evento ou prazo encontrado.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((ev) => {
            const isDeadline = ev.type === "activity_deadline";
            const dateObj = ev.start_date ? new Date(ev.start_date) : null;
            const isPast = dateObj ? dateObj < new Date() : false;

            return (
              <div
                key={ev.id}
                onClick={() => handleEventClick(ev)}
                className={`p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors cursor-pointer group ${
                  isPast ? "opacity-50" : "hover:border-emerald-500/[0.12]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold shrink-0 ${
                      isDeadline
                        ? "bg-amber-500/[0.06] text-amber-400/80 border border-amber-500/[0.1]"
                        : "bg-white/[0.03] text-neutral-400 border border-[var(--border)]"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-medium leading-none">
                      {dateObj ? dateObj.toLocaleDateString("pt-BR", { month: "short" }) : "---"}
                    </span>
                    <span className="text-xs font-bold leading-tight">
                      {dateObj ? dateObj.getDate() : "--"}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-neutral-200 group-hover:text-emerald-300/90 transition-colors truncate">
                      {ev.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500">
                      {dateObj && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {ev.course_name && <span>{ev.course_name}</span>}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded self-end sm:self-auto shrink-0 ${
                    isDeadline
                      ? "bg-amber-500/[0.06] text-amber-400/70 border border-amber-500/[0.1]"
                      : "bg-white/[0.03] text-neutral-500 border border-[var(--border)]"
                  }`}
                >
                  {isDeadline ? "Prazo" : "Evento"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
