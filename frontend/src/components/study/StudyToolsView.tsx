"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Layers,
  HelpCircle,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Lightbulb,
  Trophy,
  Target,
} from "lucide-react";
import { chatApi, coursesApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function StudyToolsView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);

  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    coursesApi.list().then(setCourses).catch(() => {});
  }, []);

  const handleGenerateFlashcards = async () => {
    setLoading(true);
    try {
      const res = await chatApi.generateFlashcards(
        selectedCourse || undefined,
        customText || undefined,
        8
      );
      if (res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        setCardIndex(0);
        setIsFlipped(false);
        toast.success(`${res.flashcards.length} flashcards gerados`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar flashcards");
    }
    setLoading(false);
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const res = await chatApi.generateQuiz(
        selectedCourse || undefined,
        customText || undefined,
        5
      );
      if (res.questions && res.questions.length > 0) {
        setQuizQuestions(res.questions);
        setSelectedAnswers({});
        setShowResults(false);
        toast.success(`${res.questions.length} questões geradas`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar simulado");
    }
    setLoading(false);
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct) score += 1;
    });
    return score;
  };

  const score = calculateScore();
  const scorePercent = quizQuestions.length
    ? Math.round((score / quizQuestions.length) * 100)
    : 0;
  const answeredCount = Object.keys(selectedAnswers).length;
  const canGenerate = Boolean(selectedCourse || customText.trim());
  const selectedCourseName = courses.find((course) => course.id === selectedCourse)?.name;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent">
              <GraduationCap className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="eyebrow text-[9px]">Treino ativo</p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Estudo<span className="text-accent">.</span>
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Flashcards e simulados gerados a partir das suas matérias
          </p>
        </div>

        <div className="flex rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("flashcards")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all sm:flex-none ${
              activeTab === "flashcards"
                ? "bg-accent text-ink-950 shadow-glow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Flashcards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all sm:flex-none ${
              activeTab === "quiz"
                ? "bg-accent text-ink-950 shadow-glow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" /> Simulado
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="panel p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold text-white">
                {activeTab === "flashcards" ? "Gerar flashcards" : "Gerar simulado"}
              </h2>
              <p className="text-[10px] text-zinc-500">
                {activeTab === "flashcards"
                  ? "8 cartões de revisão rápida"
                  : "5 questões de múltipla escolha"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="study-course"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              >
                Disciplina
              </label>
              <select
                id="study-course"
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-white transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 [&>option]:bg-ink-850"
              >
                <option value="">Selecionar disciplina...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="study-custom"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              >
                Ou um tema específico
              </label>
              <input
                id="study-custom"
                type="text"
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="Ex: Derivadas, Krebs, TCP/IP..."
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="hidden text-[10px] text-zinc-600 sm:block">
              {selectedCourseName ? (
                <>
                  Baseado em <span className="text-zinc-400">{selectedCourseName}</span>
                </>
              ) : customText.trim() ? (
                <>
                  Tema: <span className="text-zinc-400">{customText.trim()}</span>
                </>
              ) : (
                "Escolha uma disciplina ou digite um tema."
              )}
            </p>
            <button
              type="button"
              onClick={activeTab === "flashcards" ? handleGenerateFlashcards : handleGenerateQuiz}
              disabled={loading || !canGenerate}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient px-4 text-[11px] font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
            >
              {loading ? (
                <>
                  <CogSpinner size={14} className="text-ink-950" />
                  Gerando...
                </>
              ) : (
                <>
                  {activeTab === "flashcards" ? (
                    <Layers className="h-3.5 w-3.5" />
                  ) : (
                    <HelpCircle className="h-3.5 w-3.5" />
                  )}
                  {activeTab === "flashcards" ? "Gerar Flashcards" : "Gerar Simulado"}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="panel flex flex-col justify-between overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-status-warning" />
            <p className="eyebrow text-[9px]">Como funciona</p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            A IA lê seus materiais e transforma o conteúdo em revisão ativa. Quanto mais
            específico o tema, melhores os cartões.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <p className="font-display text-lg font-bold leading-none text-accent">
                {flashcards.length || "0"}
              </p>
              <p className="mt-1 text-[9px] text-zinc-600">flashcards</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <p className="font-display text-lg font-bold leading-none text-accent">
                {quizQuestions.length || "0"}
              </p>
              <p className="mt-1 text-[9px] text-zinc-600">questões</p>
            </div>
          </div>
        </div>
      </div>

      {/* Flashcards */}
      {activeTab === "flashcards" &&
        (flashcards.length > 0 ? (
          <div className="mx-auto max-w-2xl space-y-3.5">
            <div className="flex items-center justify-between px-1 text-[10px] text-zinc-500">
              <span>
                Card <span className="font-semibold text-white">{cardIndex + 1}</span> de{" "}
                {flashcards.length}
              </span>
              <span className="flex items-center gap-1">
                <RotateCw className="h-3 w-3" /> Toque para virar
              </span>
            </div>

            <div className="[perspective:1600px]">
              <motion.div
                className="relative h-64 cursor-pointer select-none sm:h-72"
                onClick={() => setIsFlipped((current) => !current)}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsFlipped((current) => !current);
                  }
                }}
                aria-label={isFlipped ? "Mostrar pergunta" : "Mostrar resposta"}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-accent/20 bg-ink-850 p-6 text-center shadow-[0_30px_100px_-50px_rgba(69,255,156,0.4)] sm:p-10"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <span className="absolute left-4 top-4 chip chip-accent py-0.5 text-[9px]">
                    Pergunta
                  </span>
                  <p className="font-display text-lg font-semibold leading-snug text-white sm:text-xl">
                    {flashcards[cardIndex].front}
                  </p>
                  <span className="absolute bottom-4 flex items-center gap-1 text-[9px] text-zinc-600">
                    <RotateCw className="h-3 w-3" /> virar cartão
                  </span>
                </div>

                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-accent/30 bg-accent p-6 text-center shadow-glow sm:p-10"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <span className="absolute left-4 top-4 rounded-full border border-ink-950/15 bg-ink-950/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-950/70">
                    Resposta
                  </span>
                  <p className="text-base font-medium leading-relaxed text-ink-950 sm:text-lg">
                    {flashcards[cardIndex].back}
                  </p>
                  <span className="absolute bottom-4 flex items-center gap-1 text-[9px] text-ink-950/60">
                    <RotateCw className="h-3 w-3" /> voltar
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCardIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={cardIndex === 0}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Anterior
              </button>

              <div className="flex items-center gap-1">
                {flashcards.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setCardIndex(index);
                      setIsFlipped(false);
                    }}
                    aria-label={`Ir para o card ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === cardIndex ? "w-5 bg-accent" : "w-1.5 bg-white/15 hover:bg-white/30"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                }}
                disabled={cardIndex === flashcards.length - 1}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-accent-gradient px-3.5 text-[11px] font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-30"
              >
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-white">Seus flashcards aparecem aqui</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Escolha uma disciplina acima e gere uma rodada de revisão.
              </p>
            </div>
          </div>
        ))}

      {/* Simulado */}
      {activeTab === "quiz" &&
        (quizQuestions.length > 0 ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Target className="h-4 w-4 text-accent" />
                <span>
                  {answeredCount} de {quizQuestions.length} respondidas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }}
                  />
                </div>
                {showResults && (
                  <span className="text-[10px] font-semibold text-accent">
                    {score}/{quizQuestions.length}
                  </span>
                )}
              </div>
            </div>

            {showResults && (
              <div className="panel-accent panel flex flex-col items-center gap-4 p-5 sm:flex-row sm:p-6">
                <div
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#45ff9c ${scorePercent}%, rgba(255,255,255,0.06) 0)`,
                  }}
                >
                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-ink-850">
                    <span className="font-display text-xl font-bold leading-none text-white">
                      {scorePercent}%
                    </span>
                    <span className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">
                      acertos
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="flex items-center justify-center gap-1.5 font-display text-sm font-semibold text-white sm:justify-start">
                    <Trophy className="h-4 w-4 text-status-warning" />
                    {scorePercent >= 80
                      ? "Excelente domínio"
                      : scorePercent >= 60
                      ? "Bom caminho"
                      : "Hora de revisar"}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    Você acertou {score} de {quizQuestions.length} questões. Revise as respostas
                    abaixo e tente novamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnswers({});
                    setShowResults(false);
                  }}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.07]"
                >
                  <RotateCw className="h-3 w-3" /> Refazer
                </button>
              </div>
            )}

            {quizQuestions.map((question, index) => {
              const selected = selectedAnswers[index];
              return (
                <div key={index} className="panel p-4 sm:p-5">
                  <h3 className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed text-zinc-100 sm:text-[13px]">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold text-zinc-500">
                      {index + 1}
                    </span>
                    <span>{question.question}</span>
                  </h3>

                  <div className="mt-3 space-y-1.5 pl-8">
                    {question.options.map((option: string, optionIndex: number) => {
                      const letter = ["A", "B", "C", "D"][optionIndex];
                      const isSelected = selected === letter;
                      const isCorrect = question.correct === letter;

                      let optionClass =
                        "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:bg-white/[0.04]";
                      if (showResults) {
                        if (isCorrect) {
                          optionClass =
                            "border-accent/35 bg-accent/[0.08] text-white";
                        } else if (isSelected && !isCorrect) {
                          optionClass =
                            "border-status-urgent/35 bg-status-urgent/[0.07] text-status-urgent";
                        }
                      } else if (isSelected) {
                        optionClass =
                          "border-accent/35 bg-accent/[0.08] text-white";
                      }

                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          disabled={showResults}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [index]: letter }))
                          }
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-2.5 text-left text-[11px] leading-relaxed transition-colors disabled:cursor-default ${optionClass}`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${
                                isSelected || (showResults && isCorrect)
                                  ? "bg-accent text-ink-950"
                                  : "bg-white/[0.05] text-zinc-500"
                              }`}
                            >
                              {letter}
                            </span>
                            {option}
                          </span>
                          {showResults && isCorrect && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                          )}
                          {showResults && isSelected && !isCorrect && (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-status-urgent" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {showResults && question.explanation && (
                    <div className="ml-8 mt-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-zinc-400">
                      <strong className="text-accent">Explicação:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {!showResults && (
              <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[11px] text-zinc-500">
                  Responda todas e confira seu desempenho.
                </p>
                <button
                  type="button"
                  onClick={() => setShowResults(true)}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-accent-gradient px-4 text-[11px] font-bold text-ink-950 shadow-glow-sm transition-all hover:shadow-glow"
                >
                  Finalizar <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-white">Seu simulado aparece aqui</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Escolha uma disciplina acima e teste seus conhecimentos.
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
