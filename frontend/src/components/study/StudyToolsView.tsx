"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Glass, SegmentedControl } from "glisse";
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
import { Button } from "@/components/ui/button";

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

  return (
    <div className="view-page view-study space-y-6">
      <div className="view-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="view-kicker">Laboratório de aprendizagem</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Central de Estudos com IA
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Fixe conceitos com repetição espaçada e teste seus conhecimentos antes das provas.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <SegmentedControl
            items={[
              { value: "flashcards", label: "Flashcards" },
              { value: "quiz", label: "Simulado (Quiz)" },
            ]}
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "flashcards" | "quiz")}
          />
        </div>
      </div>

      {/* Painel de Configuração e Geração em Glass */}
      <Glass className="study-generator p-6 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Sparkles className="h-4 w-4" />
          Gerador Inteligente por Matéria ou Tópico
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Escolher Disciplina Sincronizada
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
            >
              <option value="" className="bg-ink-950 text-zinc-400">
                Selecione uma matéria...
              </option>
              {courses.map((crs) => (
                <option key={crs.id} value={crs.id} className="bg-ink-950 text-white">
                  {crs.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Ou Tópico Específico (Opcional)
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ex: Matrizes, Ciclo de Krebs, Primeira Lei da Termodinâmica..."
              className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={activeTab === "flashcards" ? handleGenerateFlashcards : handleGenerateQuiz}
            disabled={loading || !canGenerate}
            variant="default"
            className="gap-2"
          >
            {loading ? (
              <CogSpinner size={16} className="text-ink-950" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>
              {loading
                ? "Gerando com IA..."
                : activeTab === "flashcards"
                ? "Criar Flashcards"
                : "Gerar Simulado"}
            </span>
          </Button>
        </div>
      </Glass>

      {/* Conteúdo: Flashcards */}
      {activeTab === "flashcards" && (
        <div className="space-y-4">
          {flashcards.length === 0 ? (
            <Glass className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Layers className="h-10 w-10 text-zinc-500" />
              <h3 className="font-display text-base font-semibold text-white">Pronto para criar flashcards</h3>
              <p className="max-w-xs text-xs text-zinc-400">
                Selecione uma disciplina ou digite um assunto acima e clique em "Criar Flashcards".
              </p>
            </Glass>
          ) : (
            <div className="mx-auto max-w-xl space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Card {cardIndex + 1} de {flashcards.length}
                </span>
                <span>Clique no cartão para virar</span>
              </div>
              <div
                className="study-progress"
                role="progressbar"
                aria-label="Progresso dos flashcards"
                aria-valuemin={1}
                aria-valuemax={flashcards.length}
                aria-valuenow={cardIndex + 1}
              >
                <span style={{ width: `${((cardIndex + 1) / flashcards.length) * 100}%` }} />
              </div>

              {/* 3D Flip Card */}
              <button
                type="button"
                onClick={() => setIsFlipped((flipped) => !flipped)}
                aria-label={isFlipped ? "Mostrar pergunta do flashcard" : "Mostrar resposta do flashcard"}
                className={`flashcard-flip relative h-72 w-full text-left ${isFlipped ? "is-flipped" : ""}`}
              >
                <Glass
                  className={`flashcard-flip-card flashcard-surface flex h-full w-full flex-col items-center justify-center p-8 text-center rounded-3xl border border-white/15 bg-white/[0.05] shadow-2xl backdrop-blur-2xl ${
                    isFlipped
                      ? "border-emerald-400/40 bg-emerald-500/[0.08]"
                      : "hover:border-white/25 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flashcard-content flex flex-col items-center">
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <RotateCw className="h-3 w-3" />
                      {isFlipped ? "Resposta / Explicação" : "Pergunta / Conceito"}
                    </span>

                    <p className="font-display text-lg font-bold leading-relaxed text-white">
                      {isFlipped ? flashcards[cardIndex].back : flashcards[cardIndex].front}
                    </p>
                  </div>
                </Glass>
              </button>

              {/* Controles de Navegação do Deck */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCardIndex((prev) => Math.max(0, prev - 1));
                    setIsFlipped(false);
                  }}
                  disabled={cardIndex === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>

                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="border-emerald-400/30 text-emerald-300"
                >
                  Virar Cartão
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                    setIsFlipped(false);
                  }}
                  disabled={cardIndex === flashcards.length - 1}
                  className="gap-2"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: Quiz (Simulado) */}
      {activeTab === "quiz" && (
        <div className="space-y-4">
          {quizQuestions.length === 0 ? (
            <Glass className="flex flex-col items-center justify-center gap-3 p-12 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <HelpCircle className="h-10 w-10 text-zinc-500" />
              <h3 className="font-display text-base font-semibold text-white">Pronto para gerar simulado</h3>
              <p className="max-w-xs text-xs text-zinc-400">
                Selecione uma disciplina e clique em "Gerar Simulado" para testar suas habilidades.
              </p>
            </Glass>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => {
                const selected = selectedAnswers[idx];
                const isCorrect = selected === q.correct;

                return (
                  <Glass
                    key={idx}
                    className="p-6 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-lg space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                        {idx + 1}
                      </span>
                      <h3 className="font-display text-sm font-bold text-white leading-relaxed">
                        {q.question}
                      </h3>
                    </div>

                    <div className="space-y-2 pt-1 pl-9">
                      {q.options.map((opt: string, optIdx: number) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isThisSelected = selected === letter;

                        let styleClasses = "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]";
                        if (showResults) {
                          if (letter === q.correct) {
                            styleClasses = "border-emerald-400/50 bg-emerald-500/20 text-emerald-200 font-semibold";
                          } else if (isThisSelected) {
                            styleClasses = "border-rose-500/50 bg-rose-500/20 text-rose-200";
                          }
                        } else if (isThisSelected) {
                          styleClasses = "border-emerald-400/50 bg-emerald-500/15 text-white font-semibold";
                        }

                        return (
                          <button
                            key={letter}
                            disabled={showResults}
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [idx]: letter }))
                            }
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs transition-all ${styleClasses}`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] font-bold">
                              {letter}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Glass>
                );
              })}

              <div className="quiz-footer flex flex-wrap items-center justify-between gap-3 pt-4">
                <span className="text-xs text-zinc-400">
                  {answeredCount} de {quizQuestions.length} respondidas
                </span>
                <div
                  className="study-progress order-last mx-0 h-1.5 max-w-none basis-full sm:order-none sm:mx-4 sm:max-w-40 sm:basis-auto sm:flex-1"
                  role="progressbar"
                  aria-label="Progresso do simulado"
                  aria-valuemin={0}
                  aria-valuemax={quizQuestions.length}
                  aria-valuenow={answeredCount}
                >
                  <span style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }} />
                </div>

                {!showResults ? (
                  <Button
                    onClick={() => setShowResults(true)}
                    disabled={answeredCount === 0}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    Finalizar e Ver Resultado
                  </Button>
                ) : (
                  <div className="quiz-result-actions flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-sm font-bold text-emerald-400">
                      Pontuação: {score} / {quizQuestions.length} ({scorePercent}%)
                    </span>
                    <Button
                      onClick={() => {
                        setSelectedAnswers({});
                        setShowResults(false);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Refazer Simulado
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
