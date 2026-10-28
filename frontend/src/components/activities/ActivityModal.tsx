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
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { activitiesApi, saveDownloadedFile } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { useModalA11y } from "@/hooks/use-modal-a11y";
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
  openChatWithContext,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadDetails = useCallback(async (id: string) => {
    setLoading(true);
    setDetailsError(null);
    try {
      setDetails(await activitiesApi.getDetails(id));
    } catch (error) {
      setDetailsError(
        error instanceof Error ? error.message : "Não foi possível carregar a atividade."
      );
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

  useModalA11y(dialogRef, {
    open: Boolean(activityId),
    onClose,
    initialFocusRef: closeButtonRef,
  });

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
      setAiError(
        err instanceof Error ? err.message : "A IA não conseguiu explicar esta atividade."
      );
    } finally {
      setExplaining(false);
    }
  };

  const handleAskTutor = () => {
    if (!openChatWithContext) return;
    const prompt = details?.title
      ? `Me ajude a entender a atividade "${details.title}"${details?.course_name ? ` da disciplina ${details.course_name}` : ""}. O que preciso entregar e como posso me organizar?`
      : "Me ajude a entender essa atividade.";
    onClose();
    openChatWithContext(details?.course_id || undefined, prompt);
  };

  const isSubmitted = details?.status === "submitted";
  const isManualCompleted = details?.status === "manual_completed";
  const canSubmitToMoodle = details?.type === "assign" && !isSubmitted;
  const isLate =
    details?.status === "late" ||
    (details?.status === "pending" &&
      details?.due_date &&
      new Date(details.due_date) < new Date());

  const handleManualCompletion = async (
    completed: boolean,
    reason: ManualCompletionReason,
    note?: string
  ) => {
    if (!activityId) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const result = await activitiesApi.updateManualCompletion(
        activityId,
        completed,
        reason,
        note
      );
      setDetails((current: any) => ({
        ...current,
        ...result,
        status_text:
          result.status === "manual_completed"
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
      setStatusError(
        err instanceof Error ? err.message : "Não foi possível atualizar a atividade."
      );
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
      setStatusError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a atividade ao Virtual2."
      );
    } finally {
      setSubmittingActivity(false);
    }
  };

  const statusTone = isSubmitted || isManualCompleted
    ? isManualCompleted
      ? {
          iconClass: "border-status-info/25 bg-status-info/[0.08] text-status-info",
          label: isManualCompleted ? "Entrega do grupo" : "Entregue",
        }
      : {
          iconClass: "border-accent/25 bg-accent/[0.08] text-accent",
          label: "Entregue",
        }
    : isLate
    ? {
        iconClass: "border-status-urgent/25 bg-status-urgent/[0.08] text-status-urgent",
        label: "Atrasada",
      }
    : {
        iconClass: "border-status-warning/25 bg-status-warning/[0.08] text-status-warning",
        label: "Pendente",
      };

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink-950/80 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
        tabIndex={-1}
        className="animate-scale-in flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-2xl shadow-black/70 sm:max-h-[88vh] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="border-b border-white/[0.07] bg-white/[0.015] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip chip-accent py-0.5 text-[9px]">
                  {details?.course_name || "Disciplina"}
                </span>
                <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                  {details?.activity_type || details?.type || "Tarefa"}
                </span>
                {details && (
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      isLate
                        ? "border-status-urgent/25 bg-status-urgent/[0.08] text-status-urgent"
                        : isSubmitted || isManualCompleted
                        ? "border-accent/20 bg-accent/[0.06] text-accent"
                        : "border-status-warning/20 bg-status-warning/[0.06] text-status-warning"
                    }`}
                  >
                    {statusTone.label}
                  </span>
                )}
              </div>
              <h2
                id="activity-modal-title"
                className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl"
              >
                {loading ? (
                  <span className="inline-block h-5 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                ) : (
                  details?.title
                )}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-white"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs text-zinc-400 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <CogSpinner size={24} className="text-accent" />
              <p className="text-[11px] text-zinc-500">Carregando detalhes...</p>
            </div>
          ) : detailsError ? (
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-status-urgent/10 text-status-urgent">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <p className="max-w-sm text-xs text-status-urgent">{detailsError}</p>
              <button
                type="button"
                onClick={() => loadDetails(activityId)}
                className="rounded-xl border border-white/10 px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.05]"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${statusTone.iconClass}`}>
                    {isSubmitted || isManualCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[8px]">Status</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white">
                      {details?.status_text || statusTone.label}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.07] text-accent">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[8px]">Prazo</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white">
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

                <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-500">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[8px]">Tempo</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white">
                      {details?.time_remaining || "No prazo"}
                    </p>
                  </div>
                </div>
              </div>

              {isManualCompleted && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-status-info/20 bg-status-info/[0.06] p-3.5">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-status-info" />
                  <div>
                    <p className="text-[11px] font-semibold text-status-info">
                      Entrega do grupo informada por você
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-status-info/60">
                      Ainda não é uma confirmação oficial do Virtual2.
                    </p>
                    {details?.manual_completion_note && (
                      <p className="mt-1 text-[10px] text-status-info/80">
                        {details.manual_completion_note}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {statusError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.06] p-3 text-[11px] text-status-urgent"
                >
                  {statusError}
                </div>
              )}

              {/* Enunciado */}
              <section>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-zinc-600" />
                  <h3 className="eyebrow text-[9px]">Enunciado</h3>
                </div>
                <div className="panel-soft whitespace-pre-wrap p-4 text-xs leading-relaxed text-zinc-300">
                  {details?.description || "Nenhuma instrução cadastrada."}
                </div>
              </section>

              {/* Arquivos */}
              {details?.files && details.files.length > 0 && (
                <section>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3 text-zinc-600" />
                    <h3 className="eyebrow text-[9px]">Arquivos</h3>
                    <span className="rounded-full bg-white/[0.05] px-1.5 py-px text-[9px] text-zinc-600">
                      {details.files.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {details.files.map((file: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDownloadFile(file, idx)}
                        disabled={downloadingFile === idx}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-[11px] text-zinc-400 transition-colors hover:border-accent/25 hover:bg-accent/[0.04] hover:text-accent disabled:opacity-50"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                            <FileText className="h-3 w-3" />
                          </span>
                          <span className="truncate">{file.name}</span>
                        </span>
                        {downloadingFile === idx ? (
                          <CogSpinner size={12} />
                        ) : (
                          <Download className="h-3 w-3 shrink-0 opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {aiError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.06] p-3 text-[11px] text-status-urgent"
                >
                  {aiError}
                </div>
              )}

              {explanation && (
                <section className="animate-scale-in overflow-hidden rounded-3xl border border-accent/20 bg-accent/[0.04]">
                  <div className="flex items-center justify-between gap-2 border-b border-accent/10 px-4 py-2.5">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                      <Bot className="h-3.5 w-3.5" /> Explicação da IA
                    </h3>
                    <Sparkles className="h-3.5 w-3.5 text-accent/60" />
                  </div>
                  <div className="p-4 text-xs text-zinc-300">
                    <Markdown content={explanation} />
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.07] bg-white/[0.015] p-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              {!isSubmitted && details && (
                <button
                  type="button"
                  onClick={() => setShowCompletionDialog(true)}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-semibold transition-colors ${
                    isManualCompleted
                      ? "border-status-info/25 bg-status-info/[0.07] text-status-info hover:bg-status-info/10"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  {isManualCompleted ? "Reabrir" : "Grupo entregou"}
                </button>
              )}

              {canSubmitToMoodle && (
                <button
                  type="button"
                  onClick={() => setShowSubmissionDialog(true)}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/[0.08] px-3 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/[0.12]"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar ao Virtual2
                </button>
              )}

              <button
                type="button"
                onClick={handleExplain}
                disabled={!details || explaining}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-accent/25 hover:bg-accent/[0.06] hover:text-accent disabled:opacity-40 sm:flex-none"
              >
                {explaining ? (
                  <CogSpinner size={13} />
                ) : explanation ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
                {explaining
                  ? "Lendo anexos..."
                  : explanation
                  ? "Fechar explicação"
                  : "Explicar com IA"}
              </button>

              {openChatWithContext && details && (
                <button
                  type="button"
                  onClick={handleAskTutor}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[11px] font-semibold text-zinc-400 transition-colors hover:border-accent/25 hover:bg-accent/[0.06] hover:text-accent"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Tutor
                </button>
              )}
            </div>

            {details?.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent-gradient px-4 text-[11px] font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow"
              >
                Abrir no Virtual2 <ExternalLink className="h-3 w-3" />
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
