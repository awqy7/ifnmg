"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Users, X, RotateCcw, Info } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { useModalA11y } from "@/hooks/use-modal-a11y";

export type ManualCompletionReason =
  | "group_member_submitted"
  | "submitted_elsewhere"
  | "other";

interface ManualCompletionDialogProps {
  open: boolean;
  activityTitle: string;
  alreadyCompleted?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (completed: boolean, reason: ManualCompletionReason, note?: string) => void;
}

const reasons: Array<{ value: ManualCompletionReason; label: string; description: string }> = [
  {
    value: "group_member_submitted",
    label: "Outro integrante enviou",
    description: "Alguém do grupo fez a entrega no Virtual2.",
  },
  {
    value: "submitted_elsewhere",
    label: "Entreguei por outro meio",
    description: "Enviei presencialmente, por e-mail ou outro canal.",
  },
  {
    value: "other",
    label: "Outro motivo",
    description: "Uma situação diferente das opções acima.",
  },
];

export default function ManualCompletionDialog({
  open,
  activityTitle,
  alreadyCompleted = false,
  loading = false,
  onClose,
  onConfirm,
}: ManualCompletionDialogProps) {
  const [reason, setReason] = useState<ManualCompletionReason>("group_member_submitted");
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setReason("group_member_submitted");
      setNote("");
    }
  }, [open]);

  const handleClose = () => {
    if (!loading) onClose();
  };

  useModalA11y(dialogRef, { open, onClose: handleClose });

  if (!open) return null;

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-completion-title"
        tabIndex={-1}
        className="animate-scale-in max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-ink-850 p-5 shadow-2xl shadow-black/60 sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border ${
                alreadyCompleted
                  ? "border-status-warning/25 bg-status-warning/[0.08] text-status-warning"
                  : "border-accent/25 bg-accent/[0.08] text-accent"
              }`}
            >
              {alreadyCompleted ? <RotateCcw className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <div>
              <h2
                id="manual-completion-title"
                className="font-display text-base font-semibold tracking-tight text-white"
              >
                {alreadyCompleted ? "Reabrir atividade" : "Confirmar entrega do grupo"}
              </h2>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                {activityTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {alreadyCompleted ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-status-warning/20 bg-status-warning/[0.06] p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
            <p className="text-[11px] leading-relaxed text-status-warning/80">
              A confirmação feita por você será removida. Se o Virtual2 já confirmou a entrega
              oficialmente, ela continuará concluída.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2.5 rounded-2xl border border-status-info/20 bg-status-info/[0.06] p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-info" />
              <p className="text-[11px] leading-relaxed text-status-info/80">
                Esta ação organiza seu painel, mas não envia arquivos ao Virtual2 e não será
                apresentada como confirmação oficial.
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Motivo
              </legend>
              <div className="space-y-1.5">
                {reasons.map((option) => {
                  const selected = reason === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition-colors focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 ${
                        selected
                          ? "border-accent/30 bg-accent/[0.06]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="manual-completion-reason"
                        value={option.value}
                        checked={selected}
                        onChange={() => setReason(option.value)}
                        className="sr-only"
                      />
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? "border-accent bg-accent" : "border-white/20"
                        }`}
                      >
                        {selected && <CheckCircle2 className="h-3 w-3 text-ink-950" />}
                      </span>
                      <span>
                        <span className={`block text-[11px] font-semibold ${selected ? "text-white" : "text-zinc-300"}`}>
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-600">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="manual-completion-note"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              >
                Observação <span className="font-medium normal-case tracking-normal text-zinc-600">(opcional)</span>
              </label>
              <input
                id="manual-completion-note"
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: João enviou pelo grupo"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 flex-1 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(!alreadyCompleted, reason, note.trim() || undefined)}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all disabled:opacity-40 ${
              alreadyCompleted
                ? "bg-status-warning text-ink-950 hover:brightness-110"
                : "bg-accent-gradient text-ink-950 shadow-glow-sm hover:shadow-glow"
            }`}
          >
            {loading && <CogSpinner size={14} className="text-ink-950" />}
            {alreadyCompleted ? "Remover confirmação" : "Confirmar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}
