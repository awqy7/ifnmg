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

  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [savingMoodle, setSavingMoodle] = useState(false);
  const [moodleMessage, setMoodleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [savingAI, setSavingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [notifSettings, setNotifSettings] = useState({
    new_activity: true,
    deadline_7d: true,
    deadline_3d: true,
    deadline_1d: true,
    deadline_6h: true,
    daily_briefing: true,
  });

  const handleSaveMoodle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMoodle(true);
    setMoodleMessage(null);
    try {
      const res = await moodleApi.saveCredentials(moodleUser, moodlePass);
      setMoodleMessage({ type: "success", text: res.message || "Conectado ao Virtual2!" });
      setMoodlePass("");
      refreshUser();
    } catch (err: any) {
      setMoodleMessage({ type: "error", text: err.message || "Falha ao conectar." });
    }
    setSavingMoodle(false);
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAI(true);
    setAiMessage(null);
    try {
      await chatApi.configureAI(selectedProvider, apiKey, true);
      setAiMessage(`Chave do ${selectedProvider.toUpperCase()} configurada!`);
      setApiKey("");
      refreshUser();
    } catch (err: any) {
      setAiMessage(`Erro: ${err.message || "Chave invalida"}`);
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Settings className="w-5 h-5 text-emerald-400/80" />
          Configuracoes
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Credenciais, provedores de IA e preferencias
        </p>
      </div>

      {/* Virtual2 Credentials */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
              <Lock className="w-3.5 h-3.5 text-emerald-400/80" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Virtual2 IFNMG</h2>
              <p className="text-[10px] text-neutral-500">Credenciais de sincronizacao</p>
            </div>
          </div>

          {user?.moodle_connected ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/80 bg-emerald-500/[0.06] px-2 py-0.5 rounded-full border border-emerald-500/[0.1]">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/80 bg-amber-500/[0.06] px-2 py-0.5 rounded-full border border-amber-500/[0.1]">
              <AlertCircle className="w-3 h-3" /> Desconectado
            </span>
          )}
        </div>

        <form onSubmit={handleSaveMoodle} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Usuario / CPF</label>
              <input
                type="text"
                value={moodleUser}
                onChange={(e) => setMoodleUser(e.target.value)}
                placeholder="Seu login no Virtual2"
                required
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Senha</label>
              <input
                type="password"
                value={moodlePass}
                onChange={(e) => setMoodlePass(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          {moodleMessage && (
            <div
              className={`p-2.5 rounded-lg text-[11px] ${
                moodleMessage.type === "success"
                  ? "bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-emerald-400/80"
                  : "bg-red-500/[0.06] border border-red-500/[0.1] text-red-400/80"
              }`}
            >
              {moodleMessage.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-neutral-600 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Credenciais criptografadas
            </p>
            <button
              type="submit"
              disabled={savingMoodle}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
            >
              {savingMoodle ? <CogSpinner size={14} className="text-white" /> : "Conectar"}
            </button>
          </div>
        </form>
      </div>

      {/* AI Provider */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
          <div className="p-1.5 rounded-lg bg-white/[0.03] border border-[var(--border)]">
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Provedor de IA</h2>
            <p className="text-[10px] text-neutral-500">Configure a chave de API</p>
          </div>
        </div>

        <form onSubmit={handleSaveAI} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Provedor</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
              >
                <option value="groq">Groq (Padrao)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama Local</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Chave de API</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave"
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          {aiMessage && (
            <div className="p-2.5 rounded-lg text-[11px] bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-emerald-400/80">
              {aiMessage}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingAI || !apiKey}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
            >
              {savingAI ? <CogSpinner size={14} className="text-white" /> : "Salvar"}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
          <div className="p-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.1]">
            <Bell className="w-3.5 h-3.5 text-amber-400/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Notificacoes</h2>
            <p className="text-[10px] text-neutral-500">Preferencias de alertas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: "new_activity", label: "Novas tarefas publicadas" },
            { key: "deadline_7d", label: "Prazo em 7 dias" },
            { key: "deadline_3d", label: "Prazo em 3 dias" },
            { key: "deadline_1d", label: "Prazo em 1 dia" },
            { key: "deadline_6h", label: "Prazo em 6 horas" },
            { key: "daily_briefing", label: "Briefing diario" },
          ].map((item) => {
            const active = notifSettings[item.key as keyof typeof notifSettings];
            return (
              <div
                key={item.key}
                onClick={() => handleToggleNotif(item.key)}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-emerald-500/[0.12] flex items-center justify-between gap-2 cursor-pointer transition-colors select-none"
              >
                <span className="text-[11px] text-neutral-400">{item.label}</span>
                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${active ? "bg-emerald-500/80" : "bg-neutral-700"}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${active ? "translate-x-3.5" : "translate-x-0"}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
