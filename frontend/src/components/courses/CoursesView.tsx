"use client";

import { useState, useEffect } from "react";
import { Glass, SearchField } from "glisse";
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
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { coursesApi, saveDownloadedFile } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
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
  const [query, setQuery] = useState("");

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const crs = await coursesApi.list();
      setCourses(crs);
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
    setExplainingMaterial(material.id);
    setMaterialErrors((current) => ({ ...current, [material.id]: "" }));
    try {
      const res = await coursesApi.explainMaterial(courseId, material.id);
      setExplanations((prev) => ({ ...prev, [material.id]: res.explanation }));
    } catch (err) {
      setMaterialErrors((current) => ({
        ...current,
        [material.id]: err instanceof Error ? err.message : "Não foi possível gerar a explicação do material.",
      }));
    } finally {
      setExplainingMaterial(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.teacher && c.teacher.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Disciplinas & Materiais
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Acesse conteúdos, apresentações, apostilas e tire dúvidas com o Tutor IA.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <SearchField
            placeholder="Buscar por disciplina ou professor..."
            value={query}
            onValueChange={setQuery}
          />
        </div>
      </div>

      {error && (
        <Glass
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300"
        >
          <span>{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={loadCourses} className="text-rose-200">
            Tentar novamente
          </Button>
        </Glass>
      )}

      {/* Lista de Disciplinas em Glass */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Glass key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Glass className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <BookOpen className="h-10 w-10 text-zinc-500" />
          <h3 className="font-display text-base font-semibold text-white">Nenhuma matéria encontrada</h3>
          <p className="max-w-xs text-xs text-zinc-400">
            Verifique o termo buscado ou sincronize o Virtual2 no topo da página.
          </p>
        </Glass>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourse === course.id;
            const materials = courseMaterials[course.id] || [];
            const loadingMats = loadingMaterials[course.id];

            return (
              <Glass
                key={course.id}
                className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl transition-all duration-200 shadow-lg"
              >
                {/* Header da Disciplina */}
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="flex cursor-pointer flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-bold text-white transition-colors hover:text-emerald-300">
                        {course.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-zinc-500" />
                          {course.teacher || "Docente IFNMG"}
                        </span>
                        {course.pending_activities > 0 && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="font-semibold text-amber-300">
                              {course.pending_activities} pendente{course.pending_activities > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(course.id);
                      }}
                      className="gap-1.5 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Perguntar ao Tutor</span>
                    </Button>
                    <div className={`p-1 text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Área Expandida de Materiais da Disciplina */}
                {isExpanded && (
                  <div className="border-t border-white/[0.08] bg-black/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Materiais e Conteúdos Didáticos
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {materials.length} item{materials.length === 1 ? "" : "s"} sincronizado{materials.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {loadingMats ? (
                      <div className="flex items-center justify-center p-8">
                        <CogSpinner size={22} className="text-emerald-400" />
                      </div>
                    ) : materials.length === 0 ? (
                      <p className="text-xs text-zinc-400 p-4 text-center">
                        Nenhum arquivo ou recurso anexado no Virtual2 para esta matéria.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {materials.map((mat) => {
                          const isDownloading = downloadingMaterial?.startsWith(mat.id);
                          const isExplaining = explainingMaterial === mat.id;
                          const explanation = explanations[mat.id];

                          return (
                            <Glass
                              key={mat.id}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3 min-w-0">
                                  <FileText className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <h4 className="font-display text-sm font-semibold text-white">
                                      {mat.title}
                                    </h4>
                                    {mat.type && (
                                      <p className="text-xs text-zinc-400 mt-0.5 capitalize">{mat.type}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => explainMaterial(course.id, mat)}
                                    disabled={isExplaining}
                                    className="gap-1.5 text-xs border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    {isExplaining ? (
                                      <CogSpinner size={12} className="text-emerald-400" />
                                    ) : (
                                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                    )}
                                    <span>Explicar com IA</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadMaterial(course.id, mat)}
                                    disabled={isDownloading}
                                    className="gap-1.5 text-xs text-zinc-200 hover:text-white"
                                  >
                                    {isDownloading ? (
                                      <CogSpinner size={12} className="text-zinc-200" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                    <span>Baixar</span>
                                  </Button>
                                </div>
                              </div>

                              {/* Explicação da IA para o Material */}
                              {explanation && (
                                <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs leading-relaxed text-zinc-200">
                                  <div className="mb-2 flex items-center gap-1.5 font-bold text-emerald-300">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Resumo do Tutor IA
                                  </div>
                                  <Markdown content={explanation} />
                                </div>
                              )}
                            </Glass>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}
