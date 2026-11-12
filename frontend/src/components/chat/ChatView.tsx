"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Glass } from "glisse";
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
  MessageSquare,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import Markdown from "@/components/Markdown";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";

const LOADING_MESSAGES = [
  "Buscando nos seus materiais do Virtual2...",
  "Lendo suas atividades e prazos...",
  "Analisando o conteúdo das disciplinas...",
  "Consultando anotações e PDFs das aulas...",
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
    if (distanceFromBottom < 250) {
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

  const handleNewSession = async () => {
    try {
      const newSession = await chatApi.createSession(initialCourseId, "Nova conversa");
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setHistoryOpen(false);
    } catch {}
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      try {
        const newSession = await chatApi.createSession(
          initialCourseId,
          input.trim().slice(0, 30) + (input.trim().length > 30 ? "..." : "")
        );
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        activeSessionId = newSession.id;
      } catch {
        return;
      }
    }

    if (!activeSessionId) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamStarted(false);

    // Placeholder para a resposta da IA
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const stream = chatApi.streamMessage(
        userMessage.content,
        activeSessionId,
        initialCourseId
      );

      for await (const token of stream) {
        setStreamStarted(true);
        setMessages((prev) => {
          const next = [...prev];
          if (next[assistantIndex]) {
            next[assistantIndex] = {
              ...next[assistantIndex],
              content: next[assistantIndex].content + token,
            };
          }
          return next;
        });
        scrollToBottom();
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        if (next[assistantIndex]) {
          next[assistantIndex] = {
            ...next[assistantIndex],
            content: "Desculpe, ocorreu uma instabilidade ao consultar o tutor. Tente novamente.",
          };
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(index);
    setTimeout(() => setCopiedMessage(null), 2000);
  };

  return (
    <div className="chat-workspace relative flex h-[calc(100dvh-120px)] w-full overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] backdrop-blur-2xl shadow-2xl">
      {/* Drawer de Sessões (Histórico) */}
      <div
        className={`absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-white/10 bg-ink-950/95 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          historyOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Histórico de Conversas
            </span>
          </div>
          <button
            onClick={() => setHistoryOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <Button
            onClick={handleNewSession}
            variant="glass"
            size="sm"
            className="w-full gap-2 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Conversa</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">Nenhuma conversa anterior.</p>
          ) : (
            sessions.map((s) => {
              const isActive = currentSessionId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                    isActive
                      ? "border border-emerald-400/30 bg-emerald-500/15 font-semibold text-white"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                  <span className="truncate flex-1">{s.title || "Conversa acadêmica"}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Área Principal de Chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar do chat */}
        <div className="chat-header flex h-14 items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white lg:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="font-display text-xs font-bold text-white">Tutor IA IFNMG</p>
                <p className="text-[10px] text-zinc-400">Contextualizado com disciplinas e materiais</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="chat-empty-state flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-400 shadow-[0_0_30px_rgba(185,232,106,0.25)]">
                <Bot className="h-7 w-7" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Como posso ajudar nos seus estudos?</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
                  Pergunte sobre matérias, tire dúvidas sobre exercícios, resuma materiais ou organize seus prazos.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-md w-full pt-2">
                {[
                  "Quais são minhas próximas entregas?",
                  "Me explique o último conteúdo de aula",
                  "Crie um roteiro de estudos para esta semana",
                  "Gere 5 perguntas sobre minha disciplina",
                ].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      setInput(sug);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-xs text-zinc-300 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/[0.06] hover:text-white"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const cleanedContent = isUser ? msg.content : stripThinking(msg.content);

              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                      isUser
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                        : "border-white/15 bg-white/[0.08] text-emerald-400 shadow-[0_0_12px_rgba(185,232,106,0.2)]"
                    }`}
                  >
                    {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>

                  <Glass
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? "border-emerald-400/30 bg-emerald-500/10 text-white"
                        : "border-white/12 bg-white/[0.05] text-zinc-100 shadow-md"
                    }`}
                  >
                    {!isUser && !cleanedContent && loading && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                        <CogSpinner size={14} className="text-emerald-400" />
                        <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                      </div>
                    )}

                    {cleanedContent && (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown content={cleanedContent} />
                      </div>
                    )}

                    {!isUser && cleanedContent && (
                      <div className="mt-3 flex items-center justify-end border-t border-white/[0.08] pt-2">
                        <button
                          onClick={() => copyToClipboard(cleanedContent, i)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                        >
                          {copiedMessage === i ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copiar resposta
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </Glass>
                </div>
              );
            })
          )}
        </div>

        {/* Input Composer Flutuante em Glass */}
        <div className="chat-composer border-t border-white/[0.08] bg-white/[0.02] p-4">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <Glass className="relative flex-1 rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 focus-within:border-emerald-400/50">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte ao tutor com base no seu semestre..."
                rows={1}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </Glass>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-ink-950 font-bold shadow-[0_0_15px_rgba(185,232,106,0.35)] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <CogSpinner size={16} className="text-ink-950" />
              ) : (
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
