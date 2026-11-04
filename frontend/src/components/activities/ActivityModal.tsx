"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Glass } from "glisse";
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
import { Button } from "@/components/ui/button";

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
    if (!activityId) {
      setDetails(null);
      setExplanation("");
      setAiError(null);
      return;
    }
    loadDetails(activityId);
  }, [activityId, loadDetails]);

  useModalA11y(dialogRef, {
    open: Boolean(activityId),
    onClose,
    initialFocusRef: closeButtonRef,
  });

  if (!activityId) return null;

  const handleDownloadFile = async (file: any, index: number) => {
    if (!activityId) return;
    setDownloadingFile(index);
    try {
      const download = await activitiesApi.downloadAttachment(activityId, index);
      saveDownloadedFile(download, file.name || "arquivo");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Não foi possível baixar o arquivo.");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleExplain = async () => {
    if (!activityId) return;
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
        status: "submitted",
        status_text: "Enviado para avaliação",
      }));
      setShowSubmissionDialog(false);
      window.dispatchEvent(new CustomEvent("activity-status-changed"));
      window.dispatchEvent(new CustomEvent("data-refresh"));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Falha ao enviar atividade ao Virtual2.");
    } finally {
      setSubmittingActivity(false);
    }
  };

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 backdrop-blur-md sm:items-center sm:p-4"
    >
      <Glass
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-ink-950/90 shadow-2xl backdrop-blur-2xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="border-b border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-accent">
                  {details?.course_name || "Disciplina IFNMG"}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                  {details?.activity_type || details?.type || "Tarefa"}
                </span>
                {details && (
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isLate
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : isSubmitted || isManualCompleted
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {isSubmitted ? "Entregue" : isManualCompleted ? "Grupo Entregou" : isLate ? "Atrasada" : "Pendente"}
                  </span>
                )}
              </div>

              <h2
                id="activity-modal-title"
                className="mt-3 font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
              >
                {loading ? (
                  <span className="inline-block h-6 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                ) : (
                  details?.title
                )}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs text-zinc-300 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <CogSpinner size={26} className="text-emerald-400" />
              <p className="text-xs text-zinc-400">Carregando detalhes do Virtual2...</p>
            </div>
          ) : detailsError ? (
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <p className="max-w-sm text-xs text-rose-300">{detailsError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => loadDetails(activityId)}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Cards de Status, Prazo e Tempo */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Glass className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[9px]">Situação</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-white">
                      {details?.status_text || (isLate ? "Atrasado" : "Pendente")}
                    </p>
                  </div>
                </Glass>

                <Glass className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[9px]">Data Limite</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-white">
                      {details?.due_date
                        ? new Date(details.due_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sem prazo fixado"}
                    </p>
                  </div>
                </Glass>

                <Glass className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 border border-white/10">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow text-[9px]">Tempo Restante</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-white">
                      {details?.time_remaining || "No prazo"}
                    </p>
                  </div>
                </Glass>
              </div>

              {isManualCompleted && (
                <div className="flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                  <Users className="h-5 w-5 shrink-0 text-sky-400" />
                  <div>
                    <p className="text-xs font-bold text-sky-300">
                      Entrega realizada pelo grupo (marcada por você)
                    </p>
                    <p className="mt-0.5 text-[11px] text-sky-200/80">
                      Esta alteração reflete no seu painel local enquanto o professor não corrige no Moodle.
                    </p>
                  </div>
                </div>
              )}

              {/* Enunciado e Instruções */}
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span>Enunciado & Instruções</span>
                </div>
                <Glass className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] whitespace-pre-wrap leading-relaxed text-zinc-300 text-xs">
                  {details?.description || "Nenhuma instrução em texto cadastrada para esta atividade."}
                </Glass>
              </section>

              {/* Anexos */}
              {details?.files && details.files.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                    <Paperclip className="h-4 w-4 text-emerald-400" />
                    <span>Anexos da Atividade ({details.files.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {details.files.map((file: any, idx: number) => (
                      <Glass
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-emerald-400/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="truncate text-xs font-medium text-white">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(file, idx)}
                          disabled={downloadingFile === idx}
                          className="h-8 px-2 text-emerald-400"
                        >
                          {downloadingFile === idx ? <CogSpinner size={12} /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </Glass>
                    ))}
                  </div>
                </section>
              )}

              {/* Explicação da IA */}
              {explanation && (
                <Glass className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-4 text-xs leading-relaxed text-zinc-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 mb-2">
                    <Bot className="h-4 w-4" />
                    Orientação do Tutor IA
                  </div>
                  <Markdown content={explanation} />
                </Glass>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] bg-white/[0.02] p-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {!isSubmitted && details && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompletionDialog(true)}
                  className="text-xs gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{isManualCompleted ? "Reabrir Tarefa" : "Marcar Grupo Entregou"}</span>
                </Button>
              )}

              {canSubmitToMoodle && (
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => setShowSubmissionDialog(true)}
                  className="text-xs gap-1.5 border-emerald-400/30 text-emerald-300"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar ao Virtual2</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExplain}
                disabled={!details || explaining}
                className="text-xs gap-1.5 text-emerald-300 border-emerald-400/30"
              >
                {explaining ? (
                  <CogSpinner size={12} className="text-emerald-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{explanation ? "Fechar IA" : "Explicar com IA"}</span>
              </Button>

              {openChatWithContext && details && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAskTutor}
                  className="text-xs gap-1.5 text-zinc-300 hover:text-white"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Conversar</span>
                </Button>
              )}
            </div>

            {details?.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 text-xs font-bold text-ink-950 shadow-md transition-all hover:brightness-110 active:scale-95"
              >
                <span>Abrir no Moodle</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </Glass>

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
