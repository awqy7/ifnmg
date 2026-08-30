"use client";

import { useState, useEffect } from "react";
import { GraduationCap, TrendingUp } from "lucide-react";
import { gradesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function GradesView() {
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.list();
      setGradesData(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadGrades();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <GraduationCap className="w-7 h-7 text-indigo-400" /> Boletim & Métricas de Desempenho
        </h1>
        <p className="text-sm text-gray-400">
          Monitore suas notas, visualize sua evolução por disciplina e mantenha sua média sempre acima do alvo
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <CogSpinner size={40} className="text-white" />
        </div>
      ) : gradesData.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#181826] border border-white/10 text-center text-gray-400 text-sm leading-relaxed">
          Nenhuma nota registrada no momento. Clique no botão de sincronizar para importar seu histórico e boletim do Virtual2.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {gradesData.map((course) => (
            <div
              key={course.course_id}
              className="rounded-3xl bg-[#181826] border border-white/10 overflow-hidden"
            >
              {/* Course Header with Average */}
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: course.course_color || "#6366f1" }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-white">{course.course_name}</h3>
                    <p className="text-xs text-gray-400">{course.grades.length} avaliações registradas</p>
                  </div>
                </div>

                {course.average !== null && (
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-gray-300">Média calculada:</span>
                    <span className="text-sm font-bold text-white">{course.average}</span>
                  </div>
                )}
              </div>

              {/* Grades Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/20 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-3 sm:px-5 py-3 font-semibold">Avaliação / Atividade</th>
                      <th className="px-3 sm:px-5 py-3 font-semibold">Nota Obtida</th>
                      <th className="px-3 sm:px-5 py-3 font-semibold">Nota Máxima</th>
                      <th className="px-3 sm:px-5 py-3 font-semibold">Aproveitamento</th>
                      <th className="px-3 sm:px-5 py-3 font-semibold">Feedback do Professor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {course.grades.map((grade: any) => {
                      const hasGrade = grade.grade !== null && grade.grade !== undefined;
                      return (
                        <tr key={grade.id} className="hover:bg-white/5 transition">
                          <td className="px-3 sm:px-5 py-3.5 font-medium text-white max-w-xs truncate">
                            {grade.item_name}
                          </td>
                          <td className="px-3 sm:px-5 py-3.5">
                            {hasGrade ? (
                              <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                {grade.grade}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-5 py-3.5 text-gray-400">
                            {grade.max_grade !== null ? grade.max_grade : "-"}
                          </td>
                          <td className="px-3 sm:px-5 py-3.5">
                            {grade.percentage !== null && grade.percentage !== undefined ? (
                              <span className="font-semibold text-emerald-400">
                                {grade.percentage}%
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-5 py-3.5 text-gray-400 italic max-w-sm truncate">
                            {grade.feedback || "Sem observações"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
