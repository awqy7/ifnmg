"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip, Send, X, UploadCloud, ShieldCheck } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { useModalA11y } from "@/hooks/use-modal-a11y";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 5;

interface SubmissionDialogProps {
  open: boolean;
  activityTitle: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (message: string, files: File[]) => void;
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.ceil(size / 1024)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SubmissionDialog({
  open,
  activityTitle,
  loading = false,
  onClose,
  onSubmit,
}: SubmissionDialogProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setFiles([]);
    setConfirmed(false);
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (!loading) onClose();
  };

  useModalA11y(dialogRef, {
    open,
    onClose: handleClose,
    initialFocusRef: textareaRef,
  });

  if (!open) return null;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextFiles = [...files, ...Array.from(selectedFiles)];
    if (nextFiles.length > MAX_FILES) {
      setError(`Envie no máximo ${MAX_FILES} arquivos.`);
      return;
    }
    const tooLarge = nextFiles.find((file) => file.size > MAX_FILE_BYTES);
    if (tooLarge) {
      setError(`"${tooLarge.name}" ultrapassa o limite de 10 MB.`);
      return;
    }
    if (nextFiles.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      setError("O total dos arquivos ultrapassa o limite de 20 MB.");
      return;
    }
    setError(null);
    setFiles(nextFiles);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!message.trim() && files.length === 0) {
      setError("Escreva uma resposta ou adicione pelo menos um arquivo.");
      return;
    }
    if (!confirmed) {
      setError("Confirme que deseja enviar a atividade ao Virtual2.");
      return;
    }
    setError(null);
    onSubmit(message.trim(), files);
  };

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-title"
        tabIndex={-1}
        className="animate-scale-in flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-2xl shadow-black/60 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 id="submission-title" className="font-display text-base font-semibold tracking-tight text-white">
                Enviar ao Virtual2
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

        <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
          <div>
            <label
              htmlFor="submission-message"
              className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
            >
              Resposta em texto
              <span className="font-medium normal-case tracking-normal text-zinc-600">
                opcional se anexar arquivo
              </span>
            </label>
            <textarea
              ref={textareaRef}
              id="submission-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={20_000}
              rows={4}
              placeholder="Digite sua resposta, caso a atividade aceite texto online."
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-xs leading-relaxed text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="group flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-zinc-500 transition-colors hover:border-accent/35 hover:bg-accent/[0.04] hover:text-accent disabled:opacity-40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] transition-colors group-hover:border-accent/25 group-hover:bg-accent/[0.08]">
                <UploadCloud className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-accent">
                Clique para anexar arquivos
              </span>
              <span className="text-[9px] text-zinc-600">
                Até {MAX_FILES} arquivos · 10 MB cada · 20 MB no total
              </span>
            </button>
          </div>

          {files.length > 0 && (
            <ul
              className="space-y-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5"
              aria-label="Arquivos selecionados"
            >
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.03]"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-[9px] text-zinc-600">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index)
                      )
                    }
                    disabled={loading}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-status-urgent/10 hover:text-status-urgent disabled:opacity-40"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
              <li className="border-t border-white/[0.05] px-1.5 pt-1.5 text-right text-[9px] text-zinc-600">
                Total: {formatFileSize(totalSize)} de 20 MB
              </li>
            </ul>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-status-warning/20 bg-status-warning/[0.05] p-3.5 text-[11px] leading-relaxed text-status-warning/85">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={loading}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent"
            />
            <span>
              Revisei os arquivos e confirmo que desejo enviar esta atividade para avaliação no
              Virtual2.
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-status-urgent/20 bg-status-urgent/[0.06] p-3 text-[11px] text-status-urgent"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/[0.07] p-4 sm:px-6">
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
            onClick={handleSubmit}
            disabled={loading}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-gradient text-xs font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-40"
          >
            {loading ? (
              <CogSpinner size={14} className="text-ink-950" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {loading ? "Enviando..." : "Enviar atividade"}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.05] bg-white/[0.01] px-6 py-2.5 text-[9px] text-zinc-600">
          <CheckCircle2 className="h-3 w-3 text-accent/60" />
          Envio autenticado direto ao Virtual2
        </div>
      </div>
    </div>
  );
}
