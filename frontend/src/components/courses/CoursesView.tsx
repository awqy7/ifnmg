"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  User,
  FileText,
  Sparkles,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <BookOpen className="w-7 h-7 text-indigo-400" /> Suas Disciplinas & Acervo Didático
        </h1>
        <p className="text-sm text-gray-400">
          Acesse instantaneamente todos os materiais, PDFs e aulas organizados para acelerar seu aprendizado
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <CogSpinner size={40} className="text-white" />
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#181826] border border-white/10 text-center text-gray-400 text-sm leading-relaxed">
          Nenhuma matéria encontrada. Conecte suas credenciais do Virtual2 nas Configurações para sincronizar seu plano curricular.
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const isExpanded = expandedCourse === course.id;
            const materials = courseMaterials[course.id] || [];
            const isLoadingMats = loadingMaterials[course.id];

            return (
              <div
                key={course.id}
                className="rounded-3xl bg-[#121217] border border-white/10 overflow-hidden transition shadow-xl shadow-black/40"
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.03] transition select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-md border border-white/10"
                      style={{ backgroundColor: course.color || "#10b981" }}
                    >
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{course.name}</h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {course.teacher || "Docente IFNMG"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14141a] border border-white/5 text-xs font-medium text-zinc-500 cursor-not-allowed transition"
                      title="Chat com IA (Em breve)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Mentor IA</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80">
                        BETA
                      </span>
                    </button>

                    <div className="p-1 rounded-lg bg-white/5 text-zinc-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Materials */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-3 bg-black/30">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-2">
                      <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-500">
                         Acervo & Materiais Disponibilizados
                      </span>
                      <span className="text-emerald-400 font-medium">{materials.length} conteúdos encontrados</span>
                    </div>

                    {isLoadingMats ? (
                      <div className="py-6 flex items-center justify-center">
                        <CogSpinner size={28} className="text-emerald-400" />
                      </div>
                    ) : materials.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-500">
                        Nenhum material publicado nesta disciplina até o momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-xs font-medium text-white truncate">{mat.title}</h4>
                                <p className="text-[10px] text-zinc-500 truncate">{mat.topic_name || "Geral"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {mat.url && (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400 transition"
                                  title="Abrir arquivo/link"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                disabled
                                className="p-1.5 rounded-lg bg-[#14141a] border border-white/5 text-zinc-600 cursor-not-allowed transition"
                                title="Estudar com IA (Em breve)"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                              </button>
                            </div>
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
