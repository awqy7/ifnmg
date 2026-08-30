"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, MapPin } from "lucide-react";
import { scheduleApi, coursesApi } from "@/lib/api";

export default function ScheduleView() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:40");
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [room, setRoom] = useState("");

  const loadData = async () => {
    try {
      const [sched, crs] = await Promise.all([scheduleApi.get(), coursesApi.list()]);
      setSchedule(sched);
      setCourses(crs);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleApi.add({
        day_of_week: Number(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        course_id: courseId || null,
        course_name: courses.find((c) => c.id === courseId)?.name || courseName || "Aula",
        room: room || null,
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar horario");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Remover este horario da grade?")) return;
    try {
      await scheduleApi.delete(id);
      loadData();
    } catch {}
  };

  const todayIndex = new Date().getDay() - 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <Clock className="w-5 h-5 text-emerald-400/80" />
            Horarios
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Grade semanal de aulas
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Aula
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {schedule.map((dayGroup) => {
          const isToday = dayGroup.day_index === todayIndex;
          return (
            <div
              key={dayGroup.day_index}
              className={`rounded-2xl border p-4 flex flex-col transition-colors ${
                isToday
                  ? "bg-emerald-500/[0.03] border-emerald-500/[0.12]"
                  : "bg-[var(--surface)] border-[var(--border)]"
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-xs text-neutral-200">{dayGroup.day}</h3>
                  {isToday && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/[0.1] text-emerald-400/80 border border-emerald-500/[0.15]">
                      Hoje
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-600">
                  {dayGroup.slots.length} aulas
                </span>
              </div>

              <div className="mt-2.5 space-y-2">
                {dayGroup.slots.length === 0 ? (
                  <p className="text-[11px] text-neutral-600 py-5 text-center">Sem aulas</p>
                ) : (
                  dayGroup.slots.map((slot: any) => (
                    <div
                      key={slot.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:bg-white/[0.04] flex items-center justify-between gap-2 group transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-medium text-neutral-200 truncate">
                          {slot.course_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
                          <span className="font-mono text-emerald-400/70">
                            {slot.start_time} - {slot.end_time}
                          </span>
                          {slot.room && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {slot.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/[0.06] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-colors shrink-0"
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5 w-full max-w-md shadow-2xl shadow-black/60">
            <h3 className="text-sm font-semibold text-white mb-4">Adicionar Aula</h3>

            <form onSubmit={handleAddSlot} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Dia da Semana</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                >
                  <option value={0}>Segunda-feira</option>
                  <option value={1}>Terca-feira</option>
                  <option value={2}>Quarta-feira</option>
                  <option value={3}>Quinta-feira</option>
                  <option value={4}>Sexta-feira</option>
                  <option value={5}>Sabado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">Inicio</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">Fim</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Disciplina</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                >
                  <option value="">Digitar nome manualmente...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {!courseId && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">Nome da Materia</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Ex: Calculo I, Redes..."
                    className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Sala (opcional)</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Ex: Sala 204"
                  className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
