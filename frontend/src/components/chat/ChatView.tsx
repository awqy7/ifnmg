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
  PanelLeft,
  X,
  ArrowUp,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import Markdown from "@/components/Markdown";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const LOADING_MESSAGES = [
  "Buscando nos seus materiais do Virtual2...",
  "Lendo suas atividades e prazos...",
  "Analisando o conteúdo das matérias...",
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
    setHistoryOpen(false);
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
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

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
      setHistoryOpen(false);
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

  const currentSession = sessions.find((session) => session.id === currentSessionId);

  return (
    <div className="panel relative flex h-[calc(100dvh-12rem)] min-h-[420px] overflow-hidden md:h-[calc(100dvh-7rem)] md:min-h-[520px]">
      {historyOpen && (
        <div
          className="absolute inset-0 z-20 bg-ink-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setHistoryOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar de conversas */}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-72 max-w-[82vw] shrink-0 flex-col border-r border-white/[0.07] bg-ink-900 transition-transform duration-300 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          historyOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.08] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="font-display text-xs font-semibold text-white">Tutor IA</h2>
              <p className="text-[9px] text-zinc-600">Seu contexto acadêmico</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleNewSession}
                    aria-label="Nova conversa"
                    className="text-zinc-500 hover:text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nova conversa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white md:hidden"
              aria-label="Fechar histórico"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <div className="shrink-0 rounded-2xl border border-accent/15 bg-accent/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
              <Database className="h-3 w-3" /> Virtual2 conectado
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                { icon: BookOpen, label: "Materiais" },
                { icon: FileText, label: "Atividades" },
                { icon: Clock, label: "Prazos" },
                { icon: Sparkles, label: "PDFs" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-1 text-[9px] text-zinc-500"
                >
                  <Icon className="h-2.5 w-2.5 text-accent/70" /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              Histórico
            </p>
            <div className="space-y-0.5">
              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/[0.06] p-3 text-[10px] leading-relaxed text-zinc-600">
                  Nenhuma conversa salva ainda.
                </p>
              ) : (
                sessions.map((session) => {
                  const active = currentSessionId === session.id;
                  return (
                    <button
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] transition-colors ${
                        active
                          ? "bg-accent/[0.08] font-semibold text-white"
                          : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          active ? "bg-accent" : "bg-zinc-700"
                        }`}
                      />
                      <span className="truncate">{session.title || "Conversa"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[9px] leading-relaxed text-zinc-600">
            A IA lê automaticamente seus PDFs e materiais do Virtual2.
          </div>
        </div>
      </aside>

      {/* Painel principal */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ink-850/40">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition-colors hover:text-white md:hidden"
              aria-label="Abrir histórico de conversas"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
              <Bot className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-ink-850 bg-accent" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xs font-semibold text-white">
                {currentSession?.title || "Tutor IA"}
              </h1>
              <p className="flex items-center gap-1 text-[9px] text-accent/80">
                <span className="h-1 w-1 rounded-full bg-accent" /> online · com seus dados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewSession}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-accent/25 hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova conversa</span>
          </button>
        </header>

        <div
          ref={messagesContainerRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-2 py-6 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-3xl bg-accent/20 blur-2xl" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-3xl border border-accent/25 bg-accent-gradient text-ink-950 shadow-glow">
                  <Sparkles className="h-6 w-6" />
                </span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Pergunte ao seu <span className="text-gradient-accent">semestre</span>
              </h2>
              <p className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-500">
                Prazos, PDFs, resumos e planos de estudo — tudo respondido com base nos seus
                materiais do Virtual2.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {[
                  { icon: FileText, label: "PDFs" },
                  { icon: BookOpen, label: "Materiais" },
                  { icon: Clock, label: "Prazos" },
                  { icon: Sparkles, label: "Atividades" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 rounded-full border border-accent/15 bg-accent/[0.04] px-2 py-1 text-[9px] font-medium text-accent/80"
                  >
                    <Icon className="h-2.5 w-2.5" /> {label}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid w-full grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="group flex items-start gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-zinc-400 transition-all hover:border-accent/25 hover:bg-accent/[0.04] hover:text-zinc-200"
                  >
                    <ArrowUp className="mt-0.5 h-3 w-3 shrink-0 text-accent/60 transition-transform group-hover:-translate-y-0.5" />
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
                  className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}

                  <div
                    className={`relative max-w-[90%] rounded-2xl text-xs leading-relaxed sm:max-w-[84%] sm:text-[13px] md:max-w-3xl ${
                      isUser
                        ? "rounded-br-md bg-accent-gradient p-3 font-medium text-ink-950"
                        : "rounded-bl-md border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-zinc-300 shadow-sm shadow-black/20"
                    }`}
                  >
                    {!isUser && (
                      <div className="mb-2 flex items-center justify-between gap-4 border-b border-white/[0.05] pb-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent/70">
                          Tutor IA
                        </span>
                        <button
                          type="button"
                          onClick={() => copyResponse(m.content, idx)}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
                          aria-label="Copiar resposta"
                        >
                          {copiedMessage === idx ? (
                            <Check className="h-3 w-3 text-accent" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedMessage === idx ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    )}
                    {isUser ? m.content : <Markdown content={stripThinking(m.content)} />}
                  </div>

                  {isUser && (
                    <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.05] text-zinc-400">
                      <UserIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              );
            })
          )}

          {loading && !streamStarted && (
            <div className="flex items-end gap-2">
              <span className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div className="flex max-w-[80%] flex-col gap-2 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[11px] text-accent/80">
                  <CogSpinner size={14} className="shrink-0 text-accent/70" />
                  <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </div>
                <div className="flex gap-1 pl-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/50"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/[0.07] bg-ink-900/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-4">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 transition-colors focus-within:border-accent/30 focus-within:ring-1 focus-within:ring-accent/15"
          >
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
              placeholder="Pergunte sobre prazos, PDFs ou matérias..."
              enterKeyHint="send"
              autoCorrect="on"
              spellCheck
              className="h-10 min-h-[40px] flex-1 resize-none overflow-hidden bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-zinc-600"
              style={{ height: "40px" }}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              variant="accent"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              aria-label="Enviar mensagem"
            >
              {loading ? (
                <CogSpinner size={16} className="text-ink-950" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[9px] text-zinc-600">
            Enter para enviar · Shift+Enter para nova linha · A IA pode cometer erros
          </p>
        </div>
      </div>
    </div>
  );
}
