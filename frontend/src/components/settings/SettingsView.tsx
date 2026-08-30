"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Settings,
  Lock,
  Cpu,
  Bell,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { moodleApi, chatApi, notificationsApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

export default function SettingsView() {
  const { user, refreshUser } = useAuth();

  // Moodle credentials form
  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [savingMoodle, setSavingMoodle] = useState(false);
  const [moodleMessage, setMoodleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AI Config
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [savingAI, setSavingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Notifications preferences
  const [notifSettings, setNotifSettings] = useState({
    new_activity: true,
    deadline_7d: true,
    deadline_3d: true,
    deadline_1d: true,
    deadline_6h: true,
    grade_released: true,
    daily_briefing: true,
  });

  const handleSaveMoodle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMoodle(true);
    setMoodleMessage(null);
    try {
      const res = await moodleApi.saveCredentials(moodleUser, moodlePass);
      setMoodleMessage({ type: "success", text: res.message || "Conectado ao Virtual2 com sucesso! ✅" });
      setMoodlePass("");
      refreshUser();
    } catch (err: any) {
      setMoodleMessage({ type: "error", text: err.message || "Falha ao conectar no Virtual2." });
    }
    setSavingMoodle(false);
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAI(true);
    setAiMessage(null);
    try {
      await chatApi.configureAI(selectedProvider, apiKey, true);
      setAiMessage(`Chave do ${selectedProvider.toUpperCase()} configurada com sucesso! ✅`);
      setApiKey("");
      refreshUser();
    } catch (err: any) {
      setAiMessage(`Erro: ${err.message || "Chave inválida"}`);
    }
    setSavingAI(false);
  };

  const handleToggleNotif = async (key: string) => {
    const next = { ...notifSettings, [key]: !notifSettings[key as keyof typeof notifSettings] };
    setNotifSettings(next);
    try {
      await notificationsApi.updateSettings(next);
    } catch {}
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
          <Settings className="w-7 h-7 text-emerald-400" /> Configurações do Sistema
        </h1>
        <p className="text-sm text-zinc-400">
          Gerencie suas credenciais do Moodle, provedores de inteligência e preferências de alertas
        </p>
      </div>

      {/* SECTION 1: Virtual2 Moodle Authentication */}
      <div className="rounded-3xl bg-[#121217] border border-white/10 p-4 sm:p-6 space-y-5 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Credenciais do Virtual2 IFNMG</h2>
              <p className="text-xs text-zinc-400">Sincronização em tempo real das suas disciplinas, tarefas e notas</p>
            </div>
          </div>

          {user?.moodle_connected ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <AlertCircle className="w-4 h-4" /> Desconectado
            </span>
          )}
        </div>

        <form onSubmit={handleSaveMoodle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Usuário / CPF (Virtual2)
              </label>
              <input
                type="text"
                value={moodleUser}
                onChange={(e) => setMoodleUser(e.target.value)}
                placeholder="Seu login no virtual2.ifnmg.edu.br"
                required
                className="w-full min-h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Senha (Virtual2)
              </label>
              <input
                type="password"
                value={moodlePass}
                onChange={(e) => setMoodlePass(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full min-h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {moodleMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                moodleMessage.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {moodleMessage.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Credenciais criptografadas em repouso com algoritmo Fernet (AES-128).
            </p>

            <button
              type="submit"
              disabled={savingMoodle}
              className="min-h-11 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition"
            >
              {savingMoodle ? (
                <>
                  <CogSpinner size={16} className="text-white" /> Conectando...
                </>
              ) : (
                "Salvar & Conectar"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: AI Multi-Provider Config */}
      <div className="rounded-3xl bg-[#121217] border border-white/10 p-4 sm:p-6 space-y-5 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700/50">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Provedores de Inteligência Artificial</h2>
              <p className="text-xs text-zinc-400">
                Padrão inteligente de alta performance com Groq e Google Gemini, ou conecte sua própria chave
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveAI} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Provedor de Inteligência Artificial
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full min-h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="groq">Groq GPT-OSS 120B (Ultra Rápido, Padrão)</option>
                <option value="gemini">Google Gemini 1.5 Flash (Gratuito)</option>
                <option value="openai">OpenAI GPT-4o Mini (Chave Própria)</option>
                <option value="anthropic">Anthropic Claude 3 Haiku (Chave Própria)</option>
                <option value="ollama">Ollama Local (Localhost:11434)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Chave de API (Opcional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira sua chave de API personalizada..."
                className="w-full min-h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {aiMessage && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              {aiMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingAI || !apiKey}
              className="min-h-11 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition"
            >
              {savingAI ? (
                <>
                  <CogSpinner size={16} className="text-white" /> Validando & Salvando...
                </>
              ) : (
                "Atualizar Chave de IA"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Notifications Preferences */}
      <div className="rounded-3xl bg-[#121217] border border-white/10 p-4 sm:p-6 space-y-5 shadow-xl shadow-black/40">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Preferências de Notificação</h2>
            <p className="text-xs text-zinc-400">Personalize a frequência e o tipo de avisos acadêmicos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "new_activity", label: "Novas tarefas postadas pelos professores" },
            { key: "deadline_7d", label: "Antecipação estratégica: 7 dias antes do prazo" },
            { key: "deadline_3d", label: "Alerta de foco: 3 dias antes do prazo" },
            { key: "deadline_1d", label: "Alerta prioritário: 1 dia antes do prazo" },
            { key: "deadline_6h", label: "Alerta de urgência máxima: 6 horas antes" },
            { key: "grade_released", label: "Lançamento de novas notas e correções" },
            { key: "daily_briefing", label: "Briefing diário com IA às 6h da manhã" },
          ].map((item) => {
            const active = notifSettings[item.key as keyof typeof notifSettings];
            return (
              <div
                key={item.key}
                onClick={() => handleToggleNotif(item.key)}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 flex items-center justify-between gap-3 cursor-pointer transition select-none"
              >
                <span className="text-xs text-zinc-300">{item.label}</span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition ${
                    active ? "bg-emerald-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
