"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Loader2,
  Database,
  FileText,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import Markdown from "@/components/Markdown";

/** Mensagens rotativas durante o loading — mostram que a IA está lendo os dados reais */
const LOADING_MESSAGES = [
  "🔍 Buscando nos seus materiais do Virtual2...",
  "📚 Lendo suas atividades e prazos...",
  "📝 Analisando o conteúdo das matérias...",
  "🎓 Consultando suas notas e boletim...",
  "📅 Verificando seu calendário acadêmico...",
  "🤖 Formulando resposta com base nos seus dados...",
];

/** Remove blocos <think>...</think> (inclusive truncados sem fechamento) */
const stripThinking = (text: string) =>
  text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/, "")
    .trim();

interface ChatViewProps {
  initialPrompt?: string;
  initialCourseId?: string;
}

export default function ChatView({ initialPrompt }: ChatViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Rotaciona mensagem de loading a cada 2.2s
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
    // Só rola se o usuário já estiver próximo do fim (evita pular scroll manual)
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
      // Vai ao fim após carregar histórico
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = c.scrollHeight;
      }, 50);
    } catch {}
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatApi.getSessions();
      setSessions(list);
      setCurrentSessionId((cur) => {
        if (!cur && list.length > 0) {
          selectSession(list[0].id);
        }
        return cur;
      });
    } catch {}
  }, [selectSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleNewSession = async () => {
    try {
      const res = await chatApi.createSession(
        undefined,
        "Nova conversa de estudos"
      );
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
    // Reset altura do textarea
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }

    // Optimistic user message
    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    // Força scroll ao fundo imediatamente após mensagem do usuário
    setTimeout(() => {
      const c = messagesContainerRef.current;
      if (c) c.scrollTop = c.scrollHeight;
    }, 30);

    try {
      const res = await chatApi.sendMessage(
        userText,
        currentSessionId || undefined,
        undefined
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
          content: `⚠️ Erro ao consultar IA: ${err instanceof Error ? err.message : "Tente novamente mais tarde."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Envia com Enter (sem Shift) no desktop; no mobile usa o botão do teclado */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Quais são minhas atividades pendentes e os prazos?",
    "Me explique o conteúdo dos materiais da minha matéria",
    "Como estão minhas notas no boletim?",
    "Gere questões de treino baseadas nos meus PDFs",
    "Faça um resumo dos materiais que meu professor postou",
    "Qual atividade eu devo priorizar agora?",
  ];

  return (
    /*
     * Altura: ocupa tudo entre a TopBar e a MobileBottomNav.
     * - mobile: pb-20 no <main> do Dashboard dá espaço ao bottom nav.
     *   Aqui usamos `h-full` para preencher o container pai sem calcular
     *   offsets manualmente, evitando o bug do input escondido pelo teclado.
     * - desktop (md+): flex-row com sidebar lateral.
     */
    <div className="flex flex-col md:flex-row rounded-2xl sm:rounded-3xl bg-[#181826] border border-white/10 overflow-hidden h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-6.5rem)]">
      {/* ── Sidebar: Histórico de sessões ── */}
      <div className="w-full md:w-72 md:flex-none bg-[#13131c] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0
                      /* mobile: altura fixa compacta mas scroll interno funcional */
                      h-auto md:h-full">
        {/* Cabeçalho da sidebar */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Chat IA
          </h2>
          <button
            onClick={handleNewSession}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
            title="Nova conversa"
            aria-label="Nova conversa"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo da sidebar — scroll interno no mobile (max-h limitado) e no desktop ocupa o resto */}
        <div className="flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto max-h-44 md:max-h-none md:flex-1">

          {/* Badge de dados conectados */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 space-y-1.5 shrink-0">
            <p className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
              <Database className="w-3 h-3" /> Dados do Virtual2 conectados
            </p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { icon: BookOpen, label: "Materiais" },
                { icon: FileText, label: "Atividades" },
                { icon: GraduationCap, label: "Notas" },
                { icon: Sparkles, label: "PDFs lidos" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 rounded-lg px-1.5 py-0.5">
                  <Icon className="w-2.5 h-2.5" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Histórico */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">
              Histórico
            </span>
            <div className="space-y-1">
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

        {/* Dica rodapé — oculta no mobile para ganhar espaço */}
        <div className="hidden md:block p-3 border-t border-white/10 shrink-0">
          <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-400 border border-white/5">
            💡 A IA lê automaticamente seus PDFs, slides e documentos do Virtual2.
          </div>
        </div>
      </div>

      {/* ── Painel principal do chat ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#181826]">
        {/* Área de mensagens */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-6 space-y-4 min-h-0"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Tutor IA com acesso total ao Virtual2</h3>
              <p className="text-xs text-gray-400 mt-1 mb-3">
                Pergunta qualquer coisa — leio seus PDFs, materiais, atividades e notas automaticamente.
              </p>

              {/* Badges de dados acessíveis */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {[
                  { icon: FileText, label: "PDFs e docs" },
                  { icon: BookOpen, label: "Materiais" },
                  { icon: GraduationCap, label: "Notas" },
                  { icon: Sparkles, label: "Atividades" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                    <Icon className="w-2.5 h-2.5" /> {label}
                  </span>
                ))}
              </div>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 gap-2 w-full text-left">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
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
                  className={`flex items-end gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mb-0.5">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  )}

                  <div
                    className={`
                      /* Mobile: máx 85% da largura; desktop: limite maior */
                      max-w-[85%] sm:max-w-[78%] md:max-w-2xl
                      rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed
                      ${isUser
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md whitespace-pre-wrap break-words"
                        : "bg-[#13131c] border border-white/10 text-gray-200 rounded-bl-sm"
                      }
                    `}
                  >
                    {isUser ? m.content : <Markdown content={stripThinking(m.content)} />}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0 mb-0.5">
                      <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-0.5">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="p-3 sm:p-3.5 rounded-2xl rounded-bl-sm bg-[#13131c] border border-white/10 flex flex-col gap-1.5 max-w-[75%]">
                <div className="flex items-center gap-2 text-xs text-indigo-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="transition-all duration-300">
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </span>
                </div>
                {/* Dots de animação */}
                <div className="flex gap-1 pl-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Barra de input ── */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-white/10 bg-[#13131c] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize: reset e cresce até 5 linhas (~120px)
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida ou peça um resumo..."
              enterKeyHint="send"
              autoCorrect="on"
              spellCheck
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none overflow-hidden leading-relaxed min-h-[48px]"
              style={{ height: "48px" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-indigo-600/20 shrink-0"
              aria-label="Enviar mensagem"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </form>
          <p className="text-[10px] text-gray-600 mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
