"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { coursesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

interface CoursesViewProps {
  openChat: (courseId?: string) => void;
}

export default function CoursesView({ openChat }: CoursesViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseMaterials, setCourseMaterials] = useState<Record<string, any[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});

  const loadCourses = async () => {
    setLoading(true);
    try {
      const crs = await coursesApi.list();
      setCourses(crs);
      if (crs.length > 0) {
        const firstId = crs[0].id;
        setExpandedCourse(firstId);
        setLoadingMaterials((prev) => ({ ...prev, [firstId]: true }));
        try {
          const mats = await coursesApi.getMaterials(firstId);
          setCourseMaterials((prev) => ({ ...prev, [firstId]: mats }));
        } finally {
          setLoadingMaterials((prev) => ({ ...prev, [firstId]: false }));
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const toggleExpand = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }

    setExpandedCourse(courseId);

    if (!courseMaterials[courseId]) {
      setLoadingMaterials((prev) => ({ ...prev, [courseId]: true }));
      try {
        const mats = await coursesApi.getMaterials(courseId);
        setCourseMaterials((prev) => ({ ...prev, [courseId]: mats }));
      } catch {}
      setLoadingMaterials((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <BookOpen className="w-5 h-5 text-emerald-400/80" />
          Disciplinas
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Materiais, PDFs e conteudo organizados por disciplina
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <CogSpinner size={32} className="text-neutral-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-neutral-500 text-sm">
          Nenhuma disciplina encontrada. Conecte o Virtual2 nas Configuracoes.
        </div>
      ) : (
        <div className="space-y-2.5">
          {courses.map((course) => {
            const isExpanded = expandedCourse === course.id;
            const materials = courseMaterials[course.id] || [];
            const isLoadingMats = loadingMaterials[course.id];

            return (
              <div
                key={course.id}
                className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-colors"
              >
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                      style={{ backgroundColor: course.color || "#10b981" }}
                    >
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-neutral-200 truncate">{course.name}</h3>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {course.teacher || "Docente IFNMG"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="p-1 rounded-md bg-white/[0.03] text-neutral-600">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] pb-1">
                      <span className="font-medium text-neutral-500 uppercase tracking-wider">
                        Materiais
                      </span>
                      <span className="text-emerald-400/70 font-medium">{materials.length} itens</span>
                    </div>

                    {isLoadingMats ? (
                      <div className="py-5 flex items-center justify-center">
                        <CogSpinner size={20} className="text-neutral-600" />
                      </div>
                    ) : materials.length === 0 ? (
                      <div className="py-5 text-center text-[11px] text-neutral-600">
                        Nenhum material disponivel nesta disciplina.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.12] flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-medium text-neutral-300 truncate">{mat.title}</h4>
                                <p className="text-[9px] text-neutral-600 truncate">{mat.topic_name || "Geral"}</p>
                              </div>
                            </div>
                            {mat.url && (
                              <a
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
                                title="Abrir arquivo"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
