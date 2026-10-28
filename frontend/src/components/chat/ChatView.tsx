"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Database,
  FileText,
  BookOpen,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import Markdown from "@/components/Markdown";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const LOADING_MESSAGES = [
  "Buscando nos seus materiais do Virtual2...",
  "Lendo suas atividades e prazos...",
  "Analisando o conteudo das materias...",
  "Organizando suas disciplinas...",
  "Consultando seus materiais...",
  "Formulando resposta com base nos seus dados...",
];

const stripThinking = (text: string) =>
  text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/, "")
    .trim();

interface ChatViewProps {
  initialPrompt?: string;
  initialCourseId?: string;
}

export default function ChatView({ initialPrompt, initialCourseId }: ChatViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 200) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const msgs = await chatApi.getMessages(sessionId);
      setMessages(msgs);
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = c.scrollHeight;
      }, 50);
    } catch {}
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatApi.getSessions(initialCourseId);
      setSessions(list);
      setCurrentSessionId((cur) => {
        if (!cur && list.length > 0) {
          selectSession(list[0].id);
        }
        return cur;
      });
    } catch {}
  }, [initialCourseId, selectSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleNewSession = async () => {
    try {
      const res = await chatApi.createSession(initialCourseId, "Nova conversa");
      setSessions((prev) => [
        { id: res.id, title: res.title, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setCurrentSessionId(res.id);
      setMessages([]);
      inputRef.current?.focus();
    } catch {}
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }

    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);
    setStreamStarted(false);

    setTimeout(() => {
      const c = messagesContainerRef.current;
      if (c) c.scrollTop = c.scrollHeight;
    }, 30);

    try {
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const created = await chatApi.createSession(
          initialCourseId,
          userText.length > 50 ? `${userText.slice(0, 50)}...` : userText
        );
        activeSessionId = created.id;
        setCurrentSessionId(created.id);
      }
      if (!activeSessionId) throw new Error("Não foi possível criar a conversa.");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      for await (const chunk of chatApi.streamMessage(userText, activeSessionId, initialCourseId)) {
        setStreamStarted(true);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: `${last.content}${chunk}` };
          }
          return updated;
        });
      }
      loadSessions();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Erro ao consultar IA: ${err instanceof Error ? err.message : "Tente novamente."}`,
        },
      ]);
    } finally {
      setLoading(false);
      setStreamStarted(false);
    }
  };

  const copyResponse = async (content: string, index: number) => {
    await navigator.clipboard.writeText(stripThinking(content));
    setCopiedMessage(index);
    window.setTimeout(() => setCopiedMessage(null), 1600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Quais são minhas atividades pendentes e os prazos?",
    "Explique o PDF mais recente da minha matéria",
    "Monte um plano de estudo para esta semana",
    "Gere questões de treino baseadas nos meus PDFs",
    "Faça um resumo dos materiais que meu professor postou",
    "Qual atividade eu devo priorizar agora?",
  ];

  return (
    <div className="flex flex-col md:flex-row card-elevated overflow-hidden h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-6.5rem)]">
      {/* Sidebar: Session history */}
      <div className="w-full md:w-64 md:flex-none bg-[var(--surface-elevated)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col shrink-0 h-auto md:h-full">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--ifnmblue)]/70" /> Chat IA
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSession}
                  aria-label="Nova conversa"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nova conversa</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-col gap-2.5 p-3 overflow-y-auto max-h-44 md:max-h-none md:flex-1">
          {/* Connected data badge */}
          <div className="rounded-lg border border-[var(--ifnmblue)]/0.08 bg-[var(--ifnmblue)]/0.03 p-2.5 space-y-1.5 shrink-0">
            <p className="text-[10px] font-medium text-[var(--ifnmblue)]/70 flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Virtual2 conectado
            </p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { icon: BookOpen, label: "Materiais" },
                { icon: FileText, label: "Atividades" },
                { icon: Clock, label: "Prazos" },
                { icon: Sparkles, label: "PDFs" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1 text-[9px] text-[var(--ifnmblue)]/60 bg-[var(--ifnmblue)]/0.04 rounded px-1.5 py-0.5">
                  <Icon className="w-2 h-2" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider shrink-0">
              Historico
            </span>
            <div className="space-y-0.5">
              {sessions.length === 0 ? (
                <p className="text-[11px] text-neutral-600 italic p-1.5">Nenhuma conversa salva.</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] transition-colors truncate ${
                      currentSessionId === s.id
                        ? "bg-white/[0.06] text-white font-medium"
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
                    }`}
                  >
                    {s.title || "Conversa"}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:block p-3 border-t border-[var(--border)] shrink-0">
          <div className="p-2 rounded-lg bg-white/[0.02] text-[10px] text-neutral-600 border border-[var(--border)]">
            A IA le automaticamente seus PDFs e materiais do Virtual2.
          </div>
        </div>
      </div>

      {/* Main chat panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--surface)]">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5 space-y-3 min-h-0"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ifnmblue)]/0.08 border border-[var(--ifnmblue)]/0.12 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-[var(--ifnmgreen)]/70" />
              </div>
              <h3 className="text-sm font-semibold text-white">Tutor IA</h3>
              <p className="text-[11px] text-neutral-500 mt-1 mb-4 leading-relaxed">
                Pergunte qualquer coisa sobre seus materiais, atividades e prazos do Virtual2.
              </p>

              <div className="flex flex-wrap gap-1 justify-center mb-5">
                {[
                  { icon: FileText, label: "PDFs" },
                  { icon: BookOpen, label: "Materiais" },
                  { icon: Clock, label: "Prazos" },
                  { icon: Sparkles, label: "Atividades" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 text-[9px] text-[var(--ifnmgreen)]/60 bg-[var(--ifnmgreen)]/[0.04] border border-[var(--ifnmgreen)]/[0.08] rounded-full px-2 py-0.5">
                    <Icon className="w-2 h-2" /> {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-1.5 w-full text-left">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-[var(--border)] hover:border-[var(--ifnmgreen)]/[0.12] text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isUser = m.role === "user";
              if (!isUser && !m.content) return null;
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-2 sm:gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[var(--ifnmgreen)]/[0.06] border border-[var(--ifnmgreen)]/[0.1] flex items-center justify-center text-[var(--ifnmgreen)]/60 shrink-0 mb-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[90%] sm:max-w-[84%] md:max-w-3xl rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--background)] rounded-br-md p-3"
                        : "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-bl-md px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm shadow-black/20"
                    }`}
                  >
                    {!isUser && (
                      <div className="mb-2 flex items-center justify-between border-b border-white/[0.05] pb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ifnmgreen)]/60">Tutor IA</span>
                        <button
                          type="button"
                          onClick={() => copyResponse(m.content, idx)}
                          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] text-[var(--text-tertiary)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-secondary)]"
                          aria-label="Copiar resposta"
                        >
                          {copiedMessage === idx ? <Check className="h-3 w-3 text-[var(--ifnmgreen)]" /> : <Copy className="h-3 w-3" />}
                          {copiedMessage === idx ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    )}
                    {isUser ? m.content : <Markdown content={stripThinking(m.content)} />}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-[var(--border)] flex items-center justify-center text-neutral-400 shrink-0 mb-0.5">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && !streamStarted && (
            <div className="flex items-end gap-2 sm:gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--ifnmgreen)]/[0.06] border border-[var(--ifnmgreen)]/[0.1] flex items-center justify-center text-[var(--ifnmgreen)]/60 mb-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-2xl rounded-bl-md bg-[var(--surface-elevated)] border border-[var(--border)] flex flex-col gap-1.5 max-w-[75%]">
                <div className="flex items-center gap-2 text-[11px] text-[var(--ifnmgreen)]/70">
                  <CogSpinner size={14} className="text-[var(--ifnmgreen)]/60 shrink-0" />
                  <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </div>
                <div className="flex gap-1 pl-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[var(--ifnmgreen)]/40 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="shrink-0 p-3 border-t border-[var(--border)] bg-[#0f0f12] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              enterKeyHint="send"
              autoCorrect="on"
              spellCheck
              className="flex-1 bg-white/[0.03] border border-[var(--border-strong)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--ifnmgreen)]/30 transition-colors resize-none overflow-hidden leading-relaxed min-h-[48px]"
              style={{ height: "48px" }}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              variant="default"
              size="icon"
              className="w-10 h-10"
              aria-label="Enviar mensagem"
            >
              {loading ? (
                <CogSpinner size={16} className="text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[9px] text-neutral-600 mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
