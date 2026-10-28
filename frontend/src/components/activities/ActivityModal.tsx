"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  FileText,
  ExternalLink,
  Download,
  Bot,
  Calendar,
  Send,
  Users,
} from "lucide-react";
// Download mantido para uso no botão de arquivos anexos
import { activitiesApi, saveDownloadedFile } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import Markdown from "@/components/Markdown";
import ManualCompletionDialog, { ManualCompletionReason } from "./ManualCompletionDialog";
import SubmissionDialog from "./SubmissionDialog";

interface ActivityModalProps {
  activityId: string | null;
  onClose: () => void;
  openChatWithContext?: (courseId?: string, prompt?: string) => void;
}

export default function ActivityModal({
  activityId,
  onClose,
  openChatWithContext: _openChatWithContext,
}: ActivityModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<number | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadDetails = useCallback(async (id: string) => {
    setLoading(true);
    setDetailsError(null);
    try {
      setDetails(await activitiesApi.getDetails(id));
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Não foi possível carregar a atividade.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activityId) return;
    setDetails(null);
    setExplanation("");
    setAiError(null);

    loadDetails(activityId);
  }, [activityId, loadDetails]);

  useEffect(() => {
    if (!activityId) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showCompletionDialog && !showSubmissionDialog) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [activityId, onClose, showCompletionDialog, showSubmissionDialog]);

  if (!activityId) return null;

  const handleDownloadFile = async (file: any, fileIndex: number) => {
    setDownloadingFile(fileIndex);
    setAiError(null);
    try {
      const download = await activitiesApi.downloadAttachment(activityId, fileIndex);
      saveDownloadedFile(download, file.name || "anexo");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Não foi possível baixar o arquivo.");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleExplain = async () => {
    if (explanation) {
      setExplanation("");
      return;
    }
    setExplaining(true);
    setAiError(null);
    try {
      const result = await activitiesApi.explainWithAI(activityId);
      setExplanation(result.explanation || "");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "A IA não conseguiu explicar esta atividade.");
    } finally {
      setExplaining(false);
    }
  };

  const isSubmitted = details?.status === "submitted";
  const isManualCompleted = details?.status === "manual_completed";
  const canSubmitToMoodle = details?.type === "assign" && !isSubmitted;
  const isLate =
    details?.status === "late" || (
      details?.status === "pending" &&
      details?.due_date &&
      new Date(details.due_date) < new Date()
    );

  const handleManualCompletion = async (
    completed: boolean,
    reason: ManualCompletionReason,
    note?: string
  ) => {
    if (!activityId) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const result = await activitiesApi.updateManualCompletion(activityId, completed, reason, note);
      setDetails((current: any) => ({
        ...current,
        ...result,
        status_text: result.status === "manual_completed"
          ? "Grupo entregou (informado por você)"
          : result.status === "submitted"
          ? "Enviado para avaliação"
          : result.status === "late"
          ? "Atrasado"
          : "Pendente",
      }));
      setShowCompletionDialog(false);
      window.dispatchEvent(new CustomEvent("activity-status-changed"));
      window.dispatchEvent(new CustomEvent("data-refresh"));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Não foi possível atualizar a atividade.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmission = async (message: string, files: File[]) => {
    if (!activityId) return;
    setSubmittingActivity(true);
    setStatusError(null);
    try {
      const submission = new FormData();
      submission.append("confirm", "true");
      if (message) submission.append("message", message);
      files.forEach((file) => submission.append("files", file));
      const result = await activitiesApi.submitToMoodle(activityId, submission);
      setDetails((current: any) => ({
        ...current,
        ...result,
        status_text: "Enviado para avaliação",
      }));
      setShowSubmissionDialog(false);
      window.dispatchEvent(new CustomEvent("activity-status-changed"));
      window.dispatchEvent(new CustomEvent("data-refresh"));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Não foi possível enviar a atividade ao Virtual2.");
    } finally {
      setSubmittingActivity(false);
    }
  };

  return (
    <div onMouseDown={(event) => event.target === event.currentTarget && onClose()} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
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
              <span className="text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-[var(--ifnmgreen)]/[0.06] text-[var(--ifnmgreen)]/80 border border-[var(--ifnmgreen)]/[0.1]">
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
            ref={closeButtonRef}
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
          ) : detailsError ? (
            <div role="alert" className="py-12 text-center">
              <p className="text-sm text-rose-300">{detailsError}</p>
              <button type="button" onClick={() => loadDetails(activityId)} className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-white hover:bg-white/5">
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSubmitted
                        ? "bg-[var(--ifnmgreen)]/0.08 text-[var(--ifnmgreen)]/80"
                        : isManualCompleted
                        ? "bg-[var(--status-info)]/[0.08] text-[var(--status-info)]/80"
                        : isLate
                        ? "bg-[var(--status-urgent)]/[0.08] text-[var(--status-urgent)]/80"
                        : "bg-[var(--ifnmamber)]/[0.06] text-[var(--ifnmamber)]/80"
                    }`}
                  >
                    {isSubmitted || isManualCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Status</p>
                    <p className="text-[11px] font-medium text-white">
                      {details?.status_text || (isSubmitted ? "Entregue" : "Pendente")}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ifnmgreen)]/0.06 text-[var(--ifnmgreen)]/80 flex items-center justify-center">
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
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Tempo</p>
                    <p className="text-[11px] font-medium text-white">{details?.time_remaining || "No prazo"}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {isManualCompleted && (
                <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/15 bg-sky-500/[0.05] p-3 text-sky-200/80">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold">Entrega do grupo informada por você</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-sky-300/60">Ainda não é uma confirmação oficial do Virtual2.</p>
                    {details?.manual_completion_note && <p className="mt-1 text-[10px]">{details.manual_completion_note}</p>}
                  </div>
                </div>
              )}
              {statusError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-[11px] text-red-300">{statusError}</div>
              )}

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
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDownloadFile(file, idx)}
                        disabled={downloadingFile === idx}
                        className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-[var(--border)] hover:border-[var(--ifnmblue)]/12 flex items-center justify-between gap-2 text-[11px] text-neutral-400 hover:text-[var(--ifnmblue)]/80 transition-colors"
                      >
                        <span className="truncate">{file.name}</span>
                        {downloadingFile === idx ? <CogSpinner size={12} /> : <Download className="w-3 h-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiError && (
                <div role="alert" className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-[11px] text-red-300">
                  {aiError}
                </div>
              )}

              {explanation && (
                <div className="space-y-2 rounded-xl border border-[var(--ifnmblue)]/10 bg-[var(--ifnmblue)]/0.025 p-3.5">
                  <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ifnmblue)]/70">
                    <Bot className="h-3 w-3" /> Explicação da IA
                  </h3>
                  <div className="text-xs text-neutral-300">
                    <Markdown content={explanation} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {!isSubmitted && details && (
              <button
                type="button"
                onClick={() => setShowCompletionDialog(true)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${isManualCompleted ? "border-sky-500/20 bg-sky-500/[0.06] text-sky-300" : "border-[var(--border)] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.06]"}`}
              >
                <Users className="h-3.5 w-3.5" /> {isManualCompleted ? "Reabrir" : "Grupo já entregou"}
              </button>
            )}
            {canSubmitToMoodle && (
              <button
                type="button"
                onClick={() => setShowSubmissionDialog(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ifnmblue)]/20 bg-[var(--ifnmblue)]/0.07 px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--ifnmblue)]/12"
              >
                <Send className="h-3.5 w-3.5" /> Enviar ao Virtual2
              </button>
            )}
            <button
              type="button"
              onClick={handleExplain}
              disabled={!details || explaining}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--ifnmblue)]/[0.07] hover:bg-[var(--ifnmblue)]/[0.12] border border-[var(--ifnmblue)]/10 text-[var(--text-primary)] transition-colors disabled:opacity-40 w-full sm:w-auto"
            >
              {explaining ? <CogSpinner size={13} /> : <Bot className="w-3.5 h-3.5" />}
              {explaining ? "Lendo anexos" : explanation ? "Fechar explicação" : "Explicar com IA"}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {details?.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ifnmamber)] hover:bg-[var(--ifnmblue)] text-white text-xs font-medium transition-colors w-full sm:w-auto"
              >
                Acessar no Virtual2 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
      <ManualCompletionDialog
        open={showCompletionDialog}
        activityTitle={details?.title || "Atividade"}
        alreadyCompleted={isManualCompleted}
        loading={updatingStatus}
        onClose={() => !updatingStatus && setShowCompletionDialog(false)}
        onConfirm={handleManualCompletion}
      />
      <SubmissionDialog
        open={showSubmissionDialog}
        activityTitle={details?.title || "Atividade"}
        loading={submittingActivity}
        onClose={() => !submittingActivity && setShowSubmissionDialog(false)}
        onSubmit={handleSubmission}
      />
    </div>
  );
}
