"use client";

import { useEffect, useRef, useState } from "react";
import { Glass } from "glisse";
import { CheckCircle2, Users, X, RotateCcw, Info } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { Button } from "@/components/ui/button";

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
    label: "Outro integrante do grupo enviou",
    description: "Um colega submeteu o trabalho em equipe no Virtual2.",
  },
  {
    value: "submitted_elsewhere",
    label: "Entregue por outro canal",
    description: "Envio presencial, por e-mail ou sala de aula física.",
  },
  {
    value: "other",
    label: "Outro motivo acadêmico",
    description: "Situação particular com o docente.",
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

  useModalA11y(dialogRef, {
    open,
    onClose: handleClose,
  });

  if (!open) return null;

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <Glass
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-completion-title"
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/15 bg-ink-950/90 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                alreadyCompleted
                  ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
                  : "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {alreadyCompleted ? <RotateCcw className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <h2
                id="manual-completion-title"
                className="font-display text-base font-bold text-white"
              >
                {alreadyCompleted ? "Reabrir atividade" : "Informar entrega pelo grupo"}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                {activityTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {alreadyCompleted ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-200">
              A marcação local será removida. Caso o professor já tenha lançado a nota no Virtual2,
              ela continuará como concluída pelo Moodle.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <p className="text-xs leading-relaxed text-sky-200">
                Esta ação remove o alerta de atraso no seu painel local sem submeter arquivos no Moodle.
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                Motivo da Conclusão
              </legend>
              <div className="space-y-2">
                {reasons.map((option) => {
                  const selected = reason === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                        selected
                          ? "border-emerald-400/40 bg-emerald-500/15"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
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
                          selected ? "border-emerald-400 bg-emerald-400" : "border-white/30"
                        }`}
                      >
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-ink-950 font-bold" />}
                      </span>
                      <span>
                        <span className={`block text-xs font-semibold ${selected ? "text-white" : "text-zinc-300"}`}>
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-400">
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
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-300"
              >
                Observação <span className="font-normal text-zinc-500">(opcional)</span>
              </label>
              <input
                id="manual-completion-note"
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: Enviado pelo colega Pedro no grupo"
                className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(!alreadyCompleted, reason, note.trim() || undefined)}
            variant={alreadyCompleted ? "outline" : "default"}
            className="flex-1"
          >
            {loading && <CogSpinner size={14} className="text-ink-950" />}
            {alreadyCompleted ? "Remover" : "Confirmar"}
          </Button>
        </div>
      </Glass>
    </div>
  );
}
