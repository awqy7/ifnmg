"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  User,
  FileText,
  ChevronDown,
  Download,
  MessageCircle,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((course, idx) => {
            const isExpanded = expandedCourse === course.id;
            const materials = courseMaterials[course.id] || [];
            const isLoadingMats = loadingMaterials[course.id];

            return (
              <div
                key={course.id}
                className="card-enter rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden transition-all duration-200 hover:border-emerald-500/[0.12] group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Card Header — always visible */}
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="p-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm"
                      style={{ backgroundColor: "#059669" }}
                    >
                      <BookOpen className="w-5 h-5 text-white/90" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300/90 transition-colors truncate">
                        {course.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {course.teacher || "Docente IFNMG"}
                      </p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openChat(course.id);
                      }}
                      className="p-2 rounded-lg bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] text-emerald-400/70 transition-colors shrink-0"
                      aria-label={`Abrir tutor de ${course.name}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <div className="shrink-0">
                      <div className={`p-1 rounded-md transition-all duration-200 ${isExpanded ? "bg-white/[0.06] text-neutral-300 rotate-180" : "bg-white/[0.03] text-neutral-600"}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Material count preview */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                      <FileText className="w-3 h-3" />
                      <span>{materials.length || course.total_materials || "0"} materiais</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/60 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {isExpanded ? "Recolher" : "Ver materiais"}
                    </span>
                  </div>
                </div>

                {/* Expanded Materials Section */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
                    <div className="pt-2.5 space-y-2">
                      {isLoadingMats ? (
                        <div className="py-5 flex items-center justify-center">
                          <CogSpinner size={18} className="text-neutral-600" />
                        </div>
                      ) : materials.length === 0 ? (
                        <div className="py-5 text-center text-[11px] text-neutral-600">
                          Nenhum material disponivel.
                        </div>
                      ) : (
                        materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:bg-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-medium text-neutral-300 truncate">
                                  {mat.title}
                                </h4>
                                <p className="text-[9px] text-neutral-600 truncate">
                                  {mat.topic_name || "Geral"}
                                </p>
                              </div>
                            </div>
                            {mat.url && (
                              <a
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md bg-white/[0.03] hover:bg-emerald-500/[0.08] text-neutral-500 hover:text-emerald-400/80 transition-colors shrink-0"
                                title="Abrir arquivo"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
