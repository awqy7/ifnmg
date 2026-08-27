"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Calendar, BookOpen, MapPin } from "lucide-react";
import { scheduleApi, coursesApi } from "@/lib/api";

export default function ScheduleView() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:40");
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [room, setRoom] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sched, crs] = await Promise.all([
        scheduleApi.get(),
        coursesApi.list(),
      ]);
      setSchedule(sched);
      setCourses(crs);
    } catch {}
    setLoading(false);
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
        course_name:
          courses.find((c) => c.id === courseId)?.name || courseName || "Aula",
        room: room || null,
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar horário");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Deseja remover este horário da grade?")) return;
    try {
      await scheduleApi.delete(id);
      loadData();
    } catch {}
  };

  const todayIndex = new Date().getDay() - 1; // 0 = Seg, 4 = Sex

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-indigo-400" /> Grade de Horários
          </h1>
          <p className="text-sm text-gray-400">
            Configure sua grade semanal para resumos matinais diários automáticos
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Adicionar Aula
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.map((dayGroup) => {
          const isToday = dayGroup.day_index === todayIndex;
          return (
            <div
              key={dayGroup.day_index}
              className={`rounded-3xl bg-[#181826] border p-5 flex flex-col justify-between transition ${
                isToday
                  ? "border-indigo-500/50 bg-indigo-950/20 shadow-xl shadow-indigo-500/10"
                  : "border-white/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{dayGroup.day}</h3>
                    {isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white uppercase tracking-wider">
                        Hoje
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {dayGroup.slots.length} aulas
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {dayGroup.slots.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">Sem aulas cadastradas</p>
                  ) : (
                    dayGroup.slots.map((slot: any) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 group transition"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">
                            {slot.course_name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span className="font-mono text-indigo-300">
                              {slot.start_time} - {slot.end_time}
                            </span>
                            {slot.room && (
                              <span className="flex items-center gap-0.5">
                                • <MapPin className="w-3 h-3" /> {slot.room}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition shrink-0"
                          title="Remover da grade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181826] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Adicionar Horário na Grade</h3>

            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Dia da Semana
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={0}>Segunda-feira</option>
                  <option value={1}>Terça-feira</option>
                  <option value={2}>Quarta-feira</option>
                  <option value={3}>Quinta-feira</option>
                  <option value={4}>Sexta-feira</option>
                  <option value={5}>Sábado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Início
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Disciplina Cadastrada
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Digitar nome manualmente...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {!courseId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Nome da Matéria (manual)
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Ex: Cálculo I, Redes de Computadores..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Sala / Bloco (opcional)
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Ex: Sala 204, Laboratório 2"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Salvar Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
