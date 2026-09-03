"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  User,
  FileText,
  ChevronDown,
  Download,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { coursesApi, saveDownloadedFile } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import Markdown from "@/components/Markdown";

interface CoursesViewProps {
  openChat: (courseId?: string) => void;
}

export default function CoursesView({ openChat }: CoursesViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseMaterials, setCourseMaterials] = useState<Record<string, any[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});
  const [downloadingMaterial, setDownloadingMaterial] = useState<string | null>(null);
  const [explainingMaterial, setExplainingMaterial] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const crs = await coursesApi.list();
      setCourses(crs);
      // Libera a tela assim que as disciplinas chegam. Materiais são lazy-load.
      setLoading(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as disciplinas.");
      setLoading(false);
    }
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

  const downloadMaterial = async (courseId: string, material: any, fileIndex = 0) => {
    const downloadKey = `${material.id}:${fileIndex}`;
    setDownloadingMaterial(downloadKey);
    setMaterialErrors((current) => ({ ...current, [material.id]: "" }));
    try {
      const download = await coursesApi.downloadMaterial(courseId, material.id, fileIndex);
      saveDownloadedFile(download, material.title || "material");
    } catch (err) {
      setMaterialErrors((current) => ({
        ...current,
        [material.id]: err instanceof Error ? err.message : "Não foi possível baixar o material.",
      }));
    } finally {
      setDownloadingMaterial(null);
    }
  };

  const explainMaterial = async (courseId: string, material: any) => {
    if (explanations[material.id]) {
      setExplanations((current) => {
        const next = { ...current };
        delete next[material.id];
        return next;
      });
      return;
    }
    setExplainingMaterial(material.id);
    setMaterialErrors((current) => ({ ...current, [material.id]: "" }));
    try {
      const result = await coursesApi.explainMaterial(courseId, material.id);
      setExplanations((current) => ({ ...current, [material.id]: result.explanation }));
      setCourseMaterials((current) => ({
        ...current,
        [courseId]: (current[courseId] || []).map((item) =>
          item.id === material.id ? { ...item, has_text: true } : item
        ),
      }));
    } catch (err) {
      setMaterialErrors((current) => ({
        ...current,
        [material.id]: err instanceof Error ? err.message : "A IA não conseguiu explicar este material.",
      }));
    } finally {
      setExplainingMaterial(null);
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

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-300/90">
          <span>{error}</span>
          <button type="button" onClick={loadCourses} className="font-semibold text-red-200 hover:text-white">Tentar novamente</button>
        </div>
      )}

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
                    isExpanded ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
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
                          <div key={mat.id} className="rounded-xl bg-white/[0.02] border border-[var(--border)] overflow-hidden">
                            <div className="p-2.5 hover:bg-white/[0.025] flex items-center justify-between gap-2 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                <div className="min-w-0">
                                  <h4 className="text-[11px] font-medium text-neutral-300 truncate">
                                    {mat.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[9px] text-neutral-600">
                                    <span className="truncate">{mat.topic_name || "Geral"}</span>
                                    {mat.has_text && (
                                      <span className="flex items-center gap-0.5 text-emerald-400/60 shrink-0">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> conteúdo lido
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => explainMaterial(course.id, mat)}
                                  disabled={explainingMaterial === mat.id}
                                  className="h-8 px-2 flex items-center gap-1 rounded-lg bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] text-emerald-400/80 text-[10px] font-medium transition-colors disabled:opacity-50"
                                  title="Ler e explicar com IA"
                                >
                                  {explainingMaterial === mat.id ? <CogSpinner size={12} /> : <Sparkles className="w-3 h-3" />}
                                  <span className="hidden sm:inline">{explanations[mat.id] ? "Fechar" : "Explicar"}</span>
                                </button>
                                {mat.downloadable && (!mat.files || mat.files.length <= 1) && (
                                  <button
                                    type="button"
                                    onClick={() => downloadMaterial(course.id, mat)}
                                    disabled={downloadingMaterial === `${mat.id}:0`}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] hover:bg-emerald-500/[0.08] text-neutral-500 hover:text-emerald-400/80 transition-colors disabled:opacity-50"
                                    title="Baixar direto"
                                    aria-label={`Baixar ${mat.title}`}
                                  >
                                    {downloadingMaterial === `${mat.id}:0` ? <CogSpinner size={12} /> : <Download className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                            </div>
                            {mat.files?.length > 1 && (
                              <div className="mx-2.5 mb-2.5 grid gap-1 sm:grid-cols-2">
                                {mat.files.map((file: any, fileIndex: number) => (
                                  <button
                                    key={`${file.name}-${fileIndex}`}
                                    type="button"
                                    onClick={() => downloadMaterial(course.id, mat, fileIndex)}
                                    disabled={downloadingMaterial === `${mat.id}:${fileIndex}`}
                                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-black/10 px-2.5 py-2 text-[10px] text-neutral-500 transition-colors hover:border-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                                  >
                                    <span className="truncate">{file.name}</span>
                                    {downloadingMaterial === `${mat.id}:${fileIndex}` ? <CogSpinner size={11} /> : <Download className="h-3 w-3 shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            )}
                            {materialErrors[mat.id] && (
                              <div className="mx-2.5 mb-2.5 flex items-start gap-1.5 rounded-lg bg-red-500/[0.05] border border-red-500/10 p-2 text-[10px] text-red-300">
                                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {materialErrors[mat.id]}
                              </div>
                            )}
                            {explanations[mat.id] && (
                              <div className="border-t border-[var(--border)] bg-[#0f0f12] p-3 text-xs text-neutral-300">
                                <Markdown content={explanations[mat.id]} />
                              </div>
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
