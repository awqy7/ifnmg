"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { chatApi, coursesApi } from "@/lib/api";

export default function StudyToolsView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
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
      }
    } catch (err: any) {
      alert(err.message || "Erro ao gerar flashcards");
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
      }
    } catch (err: any) {
      alert(err.message || "Erro ao gerar simulado");
    }
    setLoading(false);
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) {
        score += 1;
      }
    });
    return score;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-indigo-400" /> Ferramentas de Estudo Inteligente
        </h1>
        <p className="text-sm text-gray-400">
          Gere flashcards de memorização e simulados de provas a partir das suas matérias
        </p>
      </div>

      {/* Mode selection Tabs */}
      <div className="flex rounded-2xl bg-[#181826] border border-white/10 p-1.5 max-w-md">
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === "flashcards"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" /> Flashcards
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === "quiz"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Simulado de Prova
        </button>
      </div>

      {/* Generator Form */}
      <div className="rounded-3xl bg-[#181826] border border-white/10 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              Escolher Disciplina do Moodle
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Digitar conteúdo personalizado abaixo...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              Ou colar texto / resumo do conteúdo
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ex: Derivadas, Ciclo de Krebs, TCP/IP..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={activeTab === "flashcards" ? handleGenerateFlashcards : handleGenerateQuiz}
            disabled={loading || (!selectedCourse && !customText)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {activeTab === "flashcards" ? "Gerar Flashcards" : "Gerar Simulado"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* FLASHCARDS INTERACTIVE VIEW */}
      {activeTab === "flashcards" && flashcards.length > 0 && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 px-2">
            <span>
              Card {cardIndex + 1} de {flashcards.length}
            </span>
            <span>Clique no card para virar</span>
          </div>

          {/* Flashcard 3D Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-72 rounded-3xl bg-[#1f1f33] border border-white/15 p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-indigo-500/50 transition duration-300 shadow-2xl relative"
          >
            <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {isFlipped ? "Resposta" : "Pergunta"}
            </span>

            <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
              {isFlipped ? flashcards[cardIndex].back : flashcards[cardIndex].front}
            </p>

            <div className="absolute bottom-4 flex items-center gap-1.5 text-[11px] text-gray-400">
              <RotateCw className="w-3.5 h-3.5" /> Virar card
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={cardIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>

            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
              }}
              disabled={cardIndex === flashcards.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-semibold text-white transition"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* QUIZ INTERACTIVE VIEW */}
      {activeTab === "quiz" && quizQuestions.length > 0 && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {quizQuestions.map((q, idx) => {
            const selected = selectedAnswers[idx];
            return (
              <div
                key={idx}
                className="rounded-3xl bg-[#181826] border border-white/10 p-6 space-y-4"
              >
                <h3 className="text-sm font-bold text-white flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{q.question}</span>
                </h3>

                <div className="space-y-2">
                  {q.options.map((opt: string, optIdx: number) => {
                    const optLetter = ["A", "B", "C", "D"][optIdx];
                    const isSelected = selected === optLetter;
                    const isCorrect = q.correct === optLetter;

                    let btnStyle = "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10";
                    if (showResults) {
                      if (isCorrect) {
                        btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "bg-red-500/20 border-red-500 text-red-300";
                      }
                    } else if (isSelected) {
                      btnStyle = "bg-indigo-600/30 border-indigo-500 text-white font-semibold";
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={showResults}
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [idx]: optLetter }))
                        }
                        className={`w-full p-3 rounded-2xl border text-left text-xs transition flex items-center justify-between gap-3 ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {showResults && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {showResults && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                      </button>
                    );
                  })}
                </div>

                {showResults && q.explanation && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-gray-400">
                    <strong className="text-indigo-300 font-semibold">Explicação:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between p-4 rounded-3xl bg-[#181826] border border-white/10">
            {showResults ? (
              <div className="text-sm font-bold text-white">
                Pontuação: {calculateScore()} de {quizQuestions.length} acertos (
                {Math.round((calculateScore() / quizQuestions.length) * 100)}%)
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Responda todas as perguntas e clique em Finalizar Simulado.
              </div>
            )}

            <button
              onClick={() => setShowResults(!showResults)}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg"
            >
              {showResults ? "Refazer Simulado" : "Finalizar Simulado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
