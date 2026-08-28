"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { calendarApi } from "@/lib/api";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-indigo-400" /> Calendário Acadêmico & Prazos
          </h1>
          <p className="text-sm text-gray-400">
            Linha do tempo de avaliações, entregas e eventos do IFNMG. Clique para abrir no app.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
              filterType === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType("deadline")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
              filterType === "deadline"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Prazos de Atividades
          </button>
          <button
            onClick={() => setFilterType("event")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
              filterType === "event"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Eventos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Carregando calendário...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#181826] border border-white/10 text-center text-gray-400 text-sm">
          Nenhum evento ou prazo agendado no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            const isDeadline = ev.type === "activity_deadline";
            const dateObj = ev.start_date ? new Date(ev.start_date) : null;
            const isPast = dateObj ? dateObj < new Date() : false;

            return (
              <div
                key={ev.id}
                onClick={() => handleEventClick(ev)}
                className={`p-4 rounded-2xl bg-[#181826] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-indigo-500/40 cursor-pointer group ${
                  isPast ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 ${
                      isDeadline
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 group-hover:border-amber-500/50"
                        : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 group-hover:border-indigo-500/50"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-semibold leading-none">
                      {dateObj ? dateObj.toLocaleDateString("pt-BR", { month: "short" }) : "---"}
                    </span>
                    <span className="text-sm font-extrabold leading-tight">
                      {dateObj ? dateObj.getDate() : "--"}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition truncate">
                      {ev.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      {dateObj && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {ev.course_name && <span>• {ev.course_name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                      isDeadline
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                    }`}
                  >
                    {isDeadline ? "Ver Tarefa ⚡" : "Evento"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
