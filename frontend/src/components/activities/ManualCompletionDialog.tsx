"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Users, X } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";

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

  useEffect(() => {
    if (open) {
      setReason("group_member_submitted");
      setNote("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-completion-title"
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              {alreadyCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="manual-completion-title" className="text-sm font-semibold text-white">
                {alreadyCompleted ? "Reabrir atividade" : "Confirmar entrega do grupo"}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{activityTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-neutral-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {alreadyCompleted ? (
          <p className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/80">
            A confirmação feita por você será removida. Se o Virtual2 já confirmou a entrega oficialmente, ela continuará concluída.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-200/80">
              Esta ação organiza seu painel, mas não envia arquivos ao Virtual2 e não será apresentada como confirmação oficial.
            </p>
            <label className="block text-[11px] font-medium text-neutral-400">
              Motivo
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as ManualCompletionReason)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[#111114] px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500/40"
              >
                <option value="group_member_submitted">Outro integrante do grupo enviou</option>
                <option value="submitted_elsewhere">Entreguei por outro meio</option>
                <option value="other">Outro motivo</option>
              </select>
            </label>
            <label className="block text-[11px] font-medium text-neutral-400">
              Observação opcional
              <input
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: João enviou pelo grupo"
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500/40"
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-medium text-neutral-400 hover:bg-white/5">
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(!alreadyCompleted, reason, note.trim() || undefined)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 ${alreadyCompleted ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {loading && <CogSpinner size={14} className="text-white" />}
            {alreadyCompleted ? "Remover confirmação" : "Confirmar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}
