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
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <GraduationCap className="w-5 h-5 text-emerald-400/80" />
          Notas
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Acompanhe suas notas e media por disciplina
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <CogSpinner size={32} className="text-neutral-600" />
        </div>
      ) : gradesData.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-neutral-500 text-sm">
          Nenhuma nota registrada. Sincronize com o Virtual2.
        </div>
      ) : (
        <div className="space-y-4">
          {gradesData.map((course) => (
            <div
              key={course.course_id}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            >
              {/* Course Header */}
              <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1.5 h-8 rounded-full"
                    style={{ backgroundColor: course.course_color || "#10b981" }}
                  />
                  <div>
                    <h3 className="text-sm font-medium text-white">{course.course_name}</h3>
                    <p className="text-[11px] text-neutral-500">{course.grades.length} avaliacoes</p>
                  </div>
                </div>

                {course.average !== null && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/[0.06] border border-emerald-500/[0.1] px-3 py-1.5 rounded-lg self-start sm:self-auto">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />
                    <span className="text-[11px] text-neutral-400">Media:</span>
                    <span className="text-xs font-semibold text-emerald-400/80">{course.average}</span>
                  </div>
                )}
              </div>

              {/* Grades Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-neutral-500 uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Avaliacao</th>
                      <th className="px-4 py-2.5 font-medium">Nota</th>
                      <th className="px-4 py-2.5 font-medium">Max</th>
                      <th className="px-4 py-2.5 font-medium">%</th>
                      <th className="px-4 py-2.5 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {course.grades.map((grade: any) => {
                      const hasGrade = grade.grade !== null && grade.grade !== undefined;
                      return (
                        <tr key={grade.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-medium text-neutral-200 max-w-xs truncate">
                            {grade.item_name}
                          </td>
                          <td className="px-4 py-3">
                            {hasGrade ? (
                              <span className="font-medium text-emerald-400/80 bg-emerald-500/[0.06] px-1.5 py-0.5 rounded border border-emerald-500/[0.1]">
                                {grade.grade}
                              </span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {grade.max_grade !== null ? grade.max_grade : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {grade.percentage !== null && grade.percentage !== undefined ? (
                              <span className="font-medium text-emerald-400/80">
                                {grade.percentage}%
                              </span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 max-w-sm truncate">
                            {grade.feedback || "-"}
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
