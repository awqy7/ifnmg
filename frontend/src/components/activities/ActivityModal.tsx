"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
  ExternalLink,
  Download,
  Bot,
  Loader2,
  Calendar,
  Award,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";

interface ActivityModalProps {
  activityId: string | null;
  onClose: () => void;
  openChatWithContext?: (courseId?: string, prompt?: string) => void;
}

export default function ActivityModal({
  activityId,
  onClose,
  openChatWithContext,
}: ActivityModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    setDetails(null);
    setAiExplanation(null);
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);

    activitiesApi
      .getDetails(activityId)
      .then((data) => setDetails(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activityId]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  if (!activityId) return null;

  const handleExplainAI = async () => {
    setLoadingAi(true);
    try {
      const res = await activitiesApi.explainWithAI(activityId);
      setAiExplanation(res.explanation);
    } catch (err: any) {
      alert(err.message || "Erro ao consultar IA");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGeneratingPdf(true);
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    setPdfUrl(null);
    try {
      const blob = await activitiesApi.generateResponsePDF(activityId);
      const url = URL.createObjectURL(blob);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resposta_${activityId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Erro ao gerar PDF de respostas");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const isSubmitted = details?.status === "submitted";
  const isLate =
    details?.status === "pending" &&
    details?.due_date &&
    new Date(details.due_date) < new Date();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="activity-modal-title" className="bg-[#181826] border border-white/15 rounded-t-3xl sm:rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 bg-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: details?.course_color || "#6366f1" }}
              >
                {details?.course_name || "Disciplina"}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                {details?.type || "Atividade"}
              </span>
            </div>
            <h2 id="activity-modal-title" className="text-lg font-bold text-white leading-snug">
              {loading ? "Carregando atividade..." : details?.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition shrink-0"
            aria-label="Fechar atividade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm text-gray-300">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs">Lendo atividade diretamente do Virtual2...</p>
            </div>
          ) : (
            <>
              {/* Status & Deadline Alert Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSubmitted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isLate
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {isSubmitted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Status do Envio</p>
                    <p className="text-xs font-bold text-white">
                      {details?.status_text || (isSubmitted ? "Enviado" : "Pendente")}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Data Limite</p>
                    <p className="text-xs font-bold text-white">
                      {details?.due_date
                        ? new Date(details.due_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sem prazo fixo"}
                    </p>
                  </div>
                </div>

                {/* Grade or Time remaining */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Avaliação</p>
                    <p className="text-xs font-bold text-white">
                      {details?.grade !== null && details?.grade !== undefined
                        ? `Nota: ${details.grade} / ${details.max_grade || 100}`
                        : details?.time_remaining || "Aguardando envio"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions / Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> Enunciado & Orientações da Tarefa
                </h3>
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {details?.description || "Nenhuma instrução em texto cadastrada pelo professor."}
                </div>
              </div>

              {/* Attachments from teacher */}
              {details?.files && details.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Arquivos Anexados pelo Professor
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {details.files.map((file: any, idx: number) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 text-xs text-indigo-300 hover:text-white transition"
                      >
                        <span className="truncate">{file.name}</span>
                        <Download className="w-4 h-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Explanation Box */}
              {aiExplanation ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                    <Bot className="w-4 h-4 text-indigo-400" /> Guia de Resolução da IA
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {aiExplanation}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Precisa de ajuda com esta tarefa?</p>
                      <p className="text-[11px] text-gray-400">
                        A IA pode analisar o enunciado e gerar um passo a passo detalhado para você.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleExplainAI}
                    disabled={loadingAi || generatingPdf}
                    className="min-h-11 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition shrink-0"
                  >
                    {loadingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Explicar com IA
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mt-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Gerar PDF respondido</h4>
                <p className="text-[11px] text-gray-400">
                  A IA lê o enunciado e PDFs anexados pelo professor. O arquivo sai com seu nome e é um rascunho: revise antes de entregar.
                </p>
                <button
                  onClick={handleGeneratePDF}
                  disabled={loadingAi || generatingPdf}
                  className="w-full min-h-11 py-2 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium shadow-md flex items-center justify-center gap-2 transition">
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lendo atividade e gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Gerar PDF de Respostas
                    </>
                  )}
                </button>
                {pdfUrl && (
                  <div className="mt-2 text-xs text-green-400">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-green-300 hover:text-green-200">
                      Abrir o PDF gerado
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-4 sm:pt-4 border-t border-white/10 bg-[#13131c] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {openChatWithContext && details?.course_id && (
              <button
                onClick={() => {
                  onClose();
                  openChatWithContext(
                    details.course_id,
                    `Como posso resolver a atividade "${details.title}"?`
                  );
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition"
              >
                <Bot className="w-4 h-4 text-indigo-400" /> Tirar Dúvida no Chat IA
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {details?.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition w-full sm:w-auto"
              >
                Abrir no Moodle Virtual2 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
