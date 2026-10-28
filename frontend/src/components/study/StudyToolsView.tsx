"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  HelpCircle,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
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
      const res = await chatApi.generateFlashcards(selectedCourse || undefined, customText || undefined, 8);
      if (res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        setCardIndex(0);
        setIsFlipped(false);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao gerar flashcards");
    }
    setLoading(false);
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const res = await chatApi.generateQuiz(selectedCourse || undefined, customText || undefined, 5);
      if (res.questions && res.questions.length > 0) {
        setQuizQuestions(res.questions);
        setSelectedAnswers({});
        setShowResults(false);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao gerar simulado");
    }
    setLoading(false);
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) score += 1;
    });
    return score;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          Estudo
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Flashcards e simulados gerados a partir das suas materias
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 max-w-sm">
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "flashcards"
              ? "bg-white/[0.06] text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Flashcards
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "quiz"
              ? "bg-white/[0.06] text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Simulado
        </button>
      </div>

      {/* Generator Form */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Disciplina
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--ifnmblue)]/30 transition-colors"
            >
              <option value="">Ou digitar conteudo abaixo...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Conteudo personalizado
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ex: Derivadas, Krebs, TCP/IP..."
              className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--ifnmblue)]/30 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={activeTab === "flashcards" ? handleGenerateFlashcards : handleGenerateQuiz}
            disabled={loading || (!selectedCourse && !customText)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ifnmamber)] hover:bg-[var(--ifnmblue)] disabled:opacity-30 text-white text-xs font-medium transition-colors"
          >
            {loading ? (
              <>
                <CogSpinner size={14} className="text-white" />
                <span>Gerando...</span>
              </>
            ) : (
              activeTab === "flashcards" ? "Gerar Flashcards" : "Gerar Simulado"
            )}
          </button>
        </div>
      </div>

      {/* Flashcards View */}
      {activeTab === "flashcards" && flashcards.length > 0 && (
        <div className="max-w-lg mx-auto space-y-3.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
            <span>Card {cardIndex + 1} de {flashcards.length}</span>
            <span>Toque para virar</span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-64 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-[var(--ifnmblue)]/15 transition-colors relative"
          >
            <span className="absolute top-3 left-3 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-500 border border-[var(--border)]">
              {isFlipped ? "Resposta" : "Pergunta"}
            </span>

            <p className="text-sm font-medium text-neutral-200 leading-relaxed">
              {isFlipped ? flashcards[cardIndex].back : flashcards[cardIndex].front}
            </p>

            <div className="absolute bottom-3 flex items-center gap-1 text-[10px] text-neutral-600">
              <RotateCw className="w-3 h-3" /> Virar
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={cardIndex === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-30 text-[11px] font-medium text-neutral-300 transition-colors border border-[var(--border)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
              }}
              disabled={cardIndex === flashcards.length - 1}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--ifnmamber)] hover:bg-[var(--ifnmblue)] disabled:opacity-30 text-[11px] font-medium text-white transition-colors"
            >
              Proximo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quiz View */}
      {activeTab === "quiz" && quizQuestions.length > 0 && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {quizQuestions.map((q, idx) => {
            const selected = selectedAnswers[idx];
            return (
              <div key={idx} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
                <h3 className="text-xs font-medium text-neutral-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/[0.04] border border-[var(--border)] text-neutral-500 text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{q.question}</span>
                </h3>

                <div className="space-y-1.5 pl-7">
                  {q.options.map((opt: string, optIdx: number) => {
                    const optLetter = ["A", "B", "C", "D"][optIdx];
                    const isSelected = selected === optLetter;
                    const isCorrect = q.correct === optLetter;

                    let btnStyle = "bg-white/[0.02] border-[var(--border)] text-neutral-400 hover:bg-white/[0.04]";
                    if (showResults) {
                      if (isCorrect) {
                        btnStyle = "bg-[var(--ifnmblue)]/[0.08] border-[var(--var(--ifnmblue))]/20 text-[var(--text-primary)]";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "bg-red-500/[0.08] border-red-500/20 text-red-300";
                      }
                    } else if (isSelected) {
                      btnStyle = "bg-[var(--ifnmblue)]/[0.08] border-[var(--ifnmblue)]/20 text-white";
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={showResults}
                        onClick={() => setSelectedAnswers((prev) => ({ ...prev, [idx]: optLetter }))}
                        className={`w-full p-2.5 rounded-xl border text-left text-[11px] transition-colors flex items-center justify-between gap-2 ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {showResults && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ifnmblue)]" />}
                        {showResults && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      </button>
                    );
                  })}
                </div>

                {showResults && q.explanation && (
                  <div className="pl-7 p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] text-[11px] text-neutral-400">
                    <strong className="text-[var(--ifnmgreen)]/80">Explicacao:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            {showResults ? (
              <div className="text-xs font-medium text-white">
                {calculateScore()}/{quizQuestions.length} ({Math.round((calculateScore() / quizQuestions.length) * 100)}%)
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500">
                Responda todas e clique em Finalizar.
              </div>
            )}

            <button
              onClick={() => setShowResults(!showResults)}
              className="px-4 py-2 rounded-lg bg-[var(--ifnmamber)] hover:bg-[var(--ifnmblue)] text-white text-xs font-medium transition-colors"
            >
              {showResults ? "Refazer" : "Finalizar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
