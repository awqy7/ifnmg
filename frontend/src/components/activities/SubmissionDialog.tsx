"use client";

import { useEffect, useRef, useState } from "react";
import { Glass } from "glisse";
import { CheckCircle2, Paperclip, Send, X, UploadCloud, ShieldCheck } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { Button } from "@/components/ui/button";

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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <Glass
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-ink-950/90 shadow-2xl backdrop-blur-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 id="submission-title" className="font-display text-base font-bold text-white">
                Enviar Atividade ao Virtual2
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

        <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
          <div>
            <label
              htmlFor="submission-message"
              className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300"
            >
              Resposta em Texto
              <span className="font-normal text-zinc-500">
                (opcional se anexar arquivo)
              </span>
            </label>
            <textarea
              ref={textareaRef}
              id="submission-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={20_000}
              rows={4}
              placeholder="Digite sua resposta caso a tarefa exija texto online..."
              className="w-full resize-y rounded-2xl border border-white/12 bg-white/[0.04] p-3.5 text-xs leading-relaxed text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
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
              className="group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-zinc-400 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/[0.04] hover:text-emerald-300 disabled:opacity-40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] group-hover:border-emerald-400/30 group-hover:bg-emerald-500/10">
                <UploadCloud className="h-5 w-5 text-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300">
                Clique para selecionar arquivos
              </span>
              <span className="text-[10px] text-zinc-500">
                Até {MAX_FILES} arquivos · 10 MB cada · 20 MB no total
              </span>
            </button>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.04]"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-[10px] text-zinc-500">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index)
                      )
                    }
                    disabled={loading}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:text-rose-400 disabled:opacity-40"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              <li className="border-t border-white/[0.06] px-2 pt-2 text-right text-[10px] text-zinc-500">
                Total: {formatFileSize(totalSize)} de 20 MB
              </li>
            </ul>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-emerald-400"
            />
            <span>
              Revisei os arquivos e confirmo que desejo submeter oficialmente esta tarefa no
              Virtual2 Moodle.
            </span>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/[0.08] p-5 sm:px-6">
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
            onClick={handleSubmit}
            disabled={loading}
            variant="default"
            className="flex-1 gap-2"
          >
            {loading ? (
              <CogSpinner size={14} className="text-ink-950" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>{loading ? "Enviando ao Moodle..." : "Submeter Atividade"}</span>
          </Button>
        </div>
      </Glass>
    </div>
  );
}
