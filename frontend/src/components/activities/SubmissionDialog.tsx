"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip, Send, X } from "lucide-react";
import { CogSpinner } from "@/components/ui/CogSpinner";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setFiles([]);
    setConfirmed(false);
    setError(null);
  }, [open]);

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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="submission-title" className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-[var(--ifnmgreen)]/10 p-2 text-[var(--ifnmgreen)]">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 id="submission-title" className="text-sm font-semibold text-white">Enviar ao Virtual2</h2>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{activityTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Fechar" className="rounded-lg p-2 text-neutral-500 hover:bg-white/5 hover:text-white disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-[11px] font-medium text-neutral-400">
            Resposta em texto <span className="font-normal text-neutral-600">(opcional se anexar arquivo)</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={20_000}
              rows={5}
              placeholder="Digite sua resposta, se a atividade aceitar texto online."
              className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-[var(--ifnmblue)]/40"
            />
          </label>

          <div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-3 text-xs text-neutral-400 hover:border-[var(--ifnmblue)]/35 hover:bg-[var(--ifnmblue)]/0.03 hover:text-[var(--ifnmblue)]/90 disabled:opacity-50">
              <Paperclip className="h-4 w-4" /> Anexar arquivos
            </button>
            <p className="mt-1.5 text-[10px] text-neutral-600">Até {MAX_FILES} arquivos, 10 MB por arquivo e 20 MB no total.</p>
          </div>

          {files.length > 0 && (
            <ul className="space-y-1.5 rounded-xl border border-[var(--border)] bg-white/[0.02] p-2" aria-label="Arquivos selecionados">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 text-[11px] text-neutral-300">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-neutral-600">{formatFileSize(file.size)}</span>
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} disabled={loading} className="rounded px-1 text-neutral-500 hover:text-[var(--status-urgent)]" aria-label={`Remover ${file.name}`}>×</button>
                </li>
              ))}
              <li className="pt-1 text-right text-[10px] text-neutral-600">Total: {formatFileSize(totalSize)}</li>
            </ul>
          )}

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--ifnmamber)]/15 bg-[var(--ifnmamber)]/[0.04] p-3 text-xs leading-relaxed text-[var(--ifnmamber)]/85">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={loading} className="mt-0.5 accent-[var(--ifnmblue)]" />
            <span>Revisei os arquivos e confirmo que desejo enviar esta atividade para avaliação no Virtual2.</span>
          </label>

          {error && <p role="alert" className="rounded-xl border border-[var(--status-urgent)]/20 bg-[var(--status-urgent)]/[0.05] p-3 text-xs text-[var(--status-urgent)]">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-medium text-neutral-400 hover:bg-white/5 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ifnmgreen)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--ifnmgreen)] disabled:opacity-50">
            {loading ? <CogSpinner size={14} className="text-white" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? "Enviando..." : "Enviar atividade"}
          </button>
        </div>
      </div>
    </div>
  );
}
