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
  Search,
  Layers,
} from "lucide-react";
import { coursesApi, saveDownloadedFile } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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
        [material.id]:
          err instanceof Error ? err.message : "A IA não conseguiu explicar este material.",
      }));
    } finally {
      setExplainingMaterial(null);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCourses = courses.filter((course) => {
    if (!normalizedQuery) return true;
    return (
      course.name.toLowerCase().includes(normalizedQuery) ||
      (course.teacher || "").toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent">
              <BookOpen className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="eyebrow text-[9px]">Biblioteca</p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Disciplinas<span className="text-accent">.</span>
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {courses.length} {courses.length === 1 ? "disciplina" : "disciplinas"} · materiais,
            PDFs e conteúdo organizados
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar disciplina ou docente"
            aria-label="Buscar disciplinas"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.07] px-4 py-3 text-xs text-status-urgent"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={loadCourses} className="shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="panel p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.03]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleCourses.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-white">
              {query ? "Nenhuma disciplina encontrada" : "Nenhuma disciplina conectada"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {query
                ? "Tente outro termo ou limpe a busca."
                : "Conecte o Virtual2 nas Configurações para importar suas matérias."}
            </p>
          </div>
          {query ? (
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Limpar busca
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => openChat()}>
              <Sparkles className="h-3.5 w-3.5" /> Falar com o tutor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visibleCourses.map((course, idx) => {
            const isExpanded = expandedCourse === course.id;
            const materials = courseMaterials[course.id] || [];
            const isLoadingMats = loadingMaterials[course.id];
            const materialCount = materials.length || course.total_materials || 0;

            return (
              <div
                key={course.id}
                className={`card-enter panel overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? "border-accent/20 shadow-[0_24px_80px_-48px_rgba(69,255,156,0.5)]"
                    : "hover:border-white/15"
                }`}
                style={{ animationDelay: `${idx * 45}ms` }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(course.id)}
                      className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={isExpanded}
                    >
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-accent">
                        <BookOpen className="h-[18px] w-[18px]" />
                        <span className="absolute -right-1 -top-1 rounded-md border border-ink-850 bg-ink-750 px-1 font-mono text-[8px] font-bold text-zinc-500">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white transition-colors group-hover:text-accent-light">
                          {course.name}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                          <User className="h-3 w-3" />
                          <span className="truncate">{course.teacher || "Docente IFNMG"}</span>
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openChat(course.id)}
                              aria-label={`Abrir tutor de ${course.name}`}
                              className="text-zinc-500 hover:text-accent"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Abrir tutor de {course.name}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <button
                        type="button"
                        onClick={() => toggleExpand(course.id)}
                        aria-label={isExpanded ? "Recolher materiais" : "Ver materiais"}
                        aria-expanded={isExpanded}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                          isExpanded
                            ? "border-accent/20 bg-accent/[0.07] text-accent"
                            : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.05] pt-2.5">
                    <div className="flex items-center gap-3 text-[9px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {materialCount} {materialCount === 1 ? "material" : "materiais"}
                      </span>
                      {course.pending_activities > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-status-warning">
                          <AlertCircle className="h-3 w-3" />
                          {course.pending_activities} pendentes
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(course.id)}
                      className="text-[9px] font-semibold text-accent/80 transition-colors hover:text-accent"
                    >
                      {isExpanded ? "Recolher" : "Ver materiais"}
                    </button>
                  </div>
                </div>

                <div
                  className={`overflow-hidden border-t border-white/[0.05] bg-ink-900/40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isExpanded ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-2 p-3">
                    {isLoadingMats ? (
                      <div className="flex items-center justify-center py-6">
                        <CogSpinner size={18} className="text-accent" />
                      </div>
                    ) : materials.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-zinc-600">
                        Nenhum material disponível nesta disciplina.
                      </div>
                    ) : (
                      materials.map((mat) => (
                        <div
                          key={mat.id}
                          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/10"
                        >
                          <div className="flex items-center justify-between gap-2 p-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-500">
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <h4 className="truncate text-[11px] font-semibold text-zinc-300">
                                  {mat.title}
                                </h4>
                                <div className="mt-0.5 flex items-center gap-2 text-[9px] text-zinc-600">
                                  <span className="truncate">{mat.topic_name || "Geral"}</span>
                                  {mat.has_text && (
                                    <span className="flex shrink-0 items-center gap-0.5 text-accent/70">
                                      <CheckCircle2 className="h-2.5 w-2.5" /> conteúdo lido
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => explainMaterial(course.id, mat)}
                                      disabled={explainingMaterial === mat.id}
                                      className="text-accent/80 hover:text-accent"
                                      aria-label={explanations[mat.id] ? "Fechar explicação" : "Ler e explicar com IA"}
                                    >
                                      {explainingMaterial === mat.id ? (
                                        <CogSpinner size={12} />
                                      ) : (
                                        <Sparkles className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {explanations[mat.id] ? "Fechar explicação" : "Ler e explicar com IA"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {mat.downloadable && (!mat.files || mat.files.length <= 1) && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => downloadMaterial(course.id, mat)}
                                        disabled={downloadingMaterial === `${mat.id}:0`}
                                        aria-label={`Baixar ${mat.title}`}
                                        className="text-zinc-500 hover:text-white"
                                      >
                                        {downloadingMaterial === `${mat.id}:0` ? (
                                          <CogSpinner size={12} />
                                        ) : (
                                          <Download className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Baixar {mat.title}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>

                          {mat.files?.length > 1 && (
                            <div className="mx-2.5 mb-2.5 grid gap-1 sm:grid-cols-2">
                              {mat.files.map((file: any, fileIndex: number) => (
                                <Button
                                  key={`${file.name}-${fileIndex}`}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadMaterial(course.id, mat, fileIndex)}
                                  disabled={downloadingMaterial === `${mat.id}:${fileIndex}`}
                                  className="flex min-w-0 items-center justify-between gap-2"
                                >
                                  <span className="truncate">{file.name}</span>
                                  {downloadingMaterial === `${mat.id}:${fileIndex}` ? (
                                    <CogSpinner size={11} />
                                  ) : (
                                    <Download className="h-3 w-3 shrink-0" />
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}

                          {materialErrors[mat.id] && (
                            <div className="mx-2.5 mb-2.5 flex items-start gap-1.5 rounded-xl border border-status-urgent/15 bg-status-urgent/[0.05] p-2 text-[10px] text-status-urgent">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              {materialErrors[mat.id]}
                            </div>
                          )}

                          {explanations[mat.id] && (
                            <div className="animate-scale-in border-t border-accent/10 bg-accent/[0.03] p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-accent">
                                  <Sparkles className="h-3 w-3" /> Explicação da IA
                                </p>
                                <button
                                  type="button"
                                  onClick={() => explainMaterial(course.id, mat)}
                                  className="text-[9px] font-semibold text-zinc-500 transition-colors hover:text-white"
                                >
                                  Fechar
                                </button>
                              </div>
                              <Markdown content={explanations[mat.id]} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
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
