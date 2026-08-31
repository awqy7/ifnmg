"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  FileText,
  ExternalLink,
  Download,
  Bot,
  Calendar,
  Award,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    setDetails(null);
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
      alert(err.message || "Erro ao gerar PDF");
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/[0.06] text-emerald-400/80 border border-emerald-500/[0.1]">
                {details?.course_name || "Disciplina"}
              </span>
              <span className="text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-white/[0.03] text-neutral-500 border border-[var(--border)]">
                {details?.activity_type || "Tarefa"}
              </span>
            </div>
            <h2 id="activity-modal-title" className="text-sm font-semibold text-white leading-snug">
              {loading ? "Carregando..." : details?.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs text-neutral-300">
          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-neutral-500">
              <CogSpinner size={24} className="text-neutral-600" />
              <p className="text-[11px]">Carregando detalhes...</p>
            </div>
          ) : (
            <>
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSubmitted
                        ? "bg-emerald-500/[0.08] text-emerald-400/80"
                        : isLate
                        ? "bg-red-500/[0.08] text-red-400/80"
                        : "bg-amber-500/[0.06] text-amber-400/80"
                    }`}
                  >
                    {isSubmitted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Status</p>
                    <p className="text-[11px] font-medium text-white">
                      {details?.status_text || (isSubmitted ? "Entregue" : "Pendente")}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.06] text-emerald-400/80 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Prazo</p>
                    <p className="text-[11px] font-medium text-white">
                      {details?.due_date
                        ? new Date(details.due_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sem prazo"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-[var(--border)] flex items-center justify-center text-neutral-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Nota</p>
                    <p className="text-[11px] font-medium text-white">
                      {details?.grade !== null && details?.grade !== undefined
                        ? `${details.grade} / ${details.max_grade || 100}`
                        : details?.time_remaining || "Aguardando"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Enunciado
                </h3>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-[var(--border)] text-neutral-300 leading-relaxed whitespace-pre-wrap text-xs">
                  {details?.description || "Nenhuma instrucao cadastrada."}
                </div>
              </div>

              {/* Files */}
              {details?.files && details.files.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Arquivos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {details.files.map((file: any, idx: number) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-[var(--border)] hover:border-emerald-500/[0.12] flex items-center justify-between gap-2 text-[11px] text-neutral-400 hover:text-emerald-400/80 transition-colors"
                      >
                        <span className="truncate">{file.name}</span>
                        <Download className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            onClick={() => openChatWithContext?.(
              details?.course_id,
              `Ajude-me a entender e planejar a atividade: ${details?.title || "atividade"}`
            )}
            disabled={!details || !openChatWithContext}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border)] text-neutral-300 text-xs font-medium transition-colors disabled:opacity-40 w-full sm:w-auto"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" /> Conversar com tutor
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPdf || !details}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border)] text-neutral-300 text-xs font-medium transition-colors disabled:opacity-40 w-full sm:w-auto"
            >
              {generatingPdf ? <CogSpinner size={13} className="text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              {generatingPdf ? "Gerando" : pdfUrl ? "Gerar novamente" : "Gerar rascunho PDF"}
            </button>
            {details?.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors w-full sm:w-auto"
              >
                Acessar no Virtual2 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
