"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { chatApi, coursesApi } from "@/lib/api";
import Markdown from "@/components/Markdown";

/** Remove blocos <think>...</think> (inclusive truncados sem fechamento) */
const stripThinking = (text: string) =>
  text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/, "")
    .trim();

interface ChatViewProps {
  initialCourseId?: string;
  initialPrompt?: string;
}

export default function ChatView({ initialCourseId, initialPrompt }: ChatViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId || "");
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Rola somente a lista do chat. scrollIntoView também rolava o <main>
    // do dashboard no mobile e empurrava a barra superior para fora da tela.
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  };

  const selectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const msgs = await chatApi.getMessages(sessionId);
      setMessages(msgs);
    } catch {}
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatApi.getSessions(selectedCourse || undefined);
      setSessions(list);
      setCurrentSessionId((cur) => {
        if (!cur && list.length > 0) {
          selectSession(list[0].id);
        }
        return cur;
      });
    } catch {}
  }, [selectedCourse, selectSession]);

  useEffect(() => {
    coursesApi.list().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleNewSession = async () => {
    try {
      const res = await chatApi.createSession(
        selectedCourse || undefined,
        "Nova conversa de estudos"
      );
      setSessions((prev) => [
        { id: res.id, title: res.title, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setCurrentSessionId(res.id);
      setMessages([]);
    } catch {}
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    // Optimistic user message
    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(
        userText,
        currentSessionId || undefined,
        selectedCourse || undefined
      );

      if (!currentSessionId && res.session_id) {
        setCurrentSessionId(res.session_id);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
      loadSessions();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Erro ao consultar IA: ${err.message || "Tente novamente mais tarde."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Me explique o assunto principal da matéria de forma simples",
    "Gere 3 questões de treino sobre a matéria",
    "Quais são as melhores dicas para passar nessa matéria?",
    "Me dê um resumo rápido dos conceitos-chave",
  ];

  return (
    <div className="h-[calc(100vh-10rem)] supports-[height:100dvh]:h-[calc(100dvh-10rem)] min-h-0 md:h-[calc(100vh-6.5rem)] md:supports-[height:100dvh]:h-[calc(100dvh-6.5rem)] flex flex-col md:flex-row rounded-2xl sm:rounded-3xl bg-[#181826] border border-white/10 overflow-hidden">
      {/* Sidebar: Sessions & Course Selection */}
      <div className="w-full md:w-72 md:flex-none bg-[#13131c] border-b md:border-b-0 md:border-r border-white/10 p-3 sm:p-4 flex flex-col justify-between shrink-0 max-h-36 sm:max-h-40 md:max-h-none overflow-y-auto md:overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Tutor Acadêmico
            </h2>
            <button
              onClick={handleNewSession}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Discipline selector */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Contexto da Disciplina
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentSessionId(null);
                setMessages([]);
              }}
              className="w-full min-h-11 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">Geral (Todas as matérias)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session history */}
          <div>
            <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Histórico de Conversas
            </span>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-2">Nenhuma conversa salva.</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition truncate block ${
                      currentSessionId === s.id
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {s.title || "Conversa"}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-400 border border-white/5">
          💡 A IA utiliza os materiais e atividades do Virtual2 para responder dúvidas específicas.
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#181826]">
        {/* Chat Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Como posso te ajudar a estudar hoje?</h3>
              <p className="text-xs text-gray-400 mt-1 mb-6">
                Tire dúvidas sobre suas matérias, peça resumos, simule provas e domine o conteúdo do IFNMG.
              </p>

              {/* Quick Prompt suggestions */}
              <div className="grid grid-cols-1 gap-2 w-full text-left">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                    }}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 text-xs text-gray-300 hover:text-white transition text-left"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-sm shadow-md whitespace-pre-wrap"
                        : "bg-[#13131c] border border-white/10 text-gray-200 rounded-tl-sm"
                    }`}
                  >
                    {isUser ? m.content : <Markdown content={stripThinking(m.content)} />}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#13131c] border border-white/10 text-xs text-indigo-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando resposta inteligente...
              </div>
            </div>
          )}

        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-[#13131c] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou peça um resumo/exercício..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-lg shadow-indigo-600/20 shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
