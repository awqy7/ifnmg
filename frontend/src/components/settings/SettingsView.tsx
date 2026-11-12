"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Glass, Switch } from "glisse";
import {
  Settings,
  Lock,
  Cpu,
  Bell,
  CheckCircle2,
  AlertCircle,
  Shield,
  Mail,
  Sparkles,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { moodleApi, chatApi, notificationsApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";

export default function SettingsView() {
  const { user, refreshUser } = useAuth();

  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [showMoodlePass, setShowMoodlePass] = useState(false);
  const [savingMoodle, setSavingMoodle] = useState(false);
  const [moodleMessage, setMoodleMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingAI, setSavingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    new_activity: true,
    deadline_7d: true,
    deadline_3d: true,
    deadline_1d: true,
    deadline_6h: true,
    daily_briefing: true,
    quiet_start: "22:00",
    quiet_end: "07:00",
  });

  useEffect(() => {
    if (user?.ai_provider) setSelectedProvider(user.ai_provider);
    notificationsApi
      .getSettings()
      .then((saved) => {
        setNotifSettings((current) => ({ ...current, ...saved } as typeof current));
      })
      .catch(() => {});
  }, [user?.ai_provider]);

  const handleSaveMoodle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMoodle(true);
    setMoodleMessage(null);
    try {
      const res = await moodleApi.saveCredentials(moodleUser, moodlePass);
      setMoodleMessage({ type: "success", text: res.message || "Conexão com Virtual2 validada!" });
      setMoodlePass("");
      refreshUser();
    } catch (err: any) {
      setMoodleMessage({ type: "error", text: err.message || "Falha ao conectar com o Virtual2." });
    }
    setSavingMoodle(false);
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAI(true);
    setAiMessage(null);
    try {
      await chatApi.configureAI(selectedProvider, apiKey, true);
      setAiMessage(`Chave do ${selectedProvider.toUpperCase()} configurada com sucesso!`);
      setApiKey("");
      refreshUser();
    } catch (err: any) {
      setAiMessage(`Erro: ${err.message || "Chave inválida"}`);
    }
    setSavingAI(false);
  };

  const handleToggleNotif = async (key: string, checked: boolean) => {
    const next = {
      ...notifSettings,
      [key]: checked,
    };
    setNotifSettings(next);
    try {
      await notificationsApi.updateSettings({ [key]: checked });
    } catch {}
  };

  return (
    <div className="view-page view-settings space-y-6">
      <div className="view-heading">
        <p className="view-kicker">Seu espaço, suas regras</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          Configurações & Conexões
        </h1>
        <p className="mt-1 text-sm text-zinc-300">
          Gerencie integrações com o Virtual2 Moodle, chaves de IA e preferências de alertas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Seção 1: Credenciais do Virtual2 (Moodle) */}
        <Glass className="settings-panel p-6 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-white">Conexão Virtual2 (Moodle)</h2>
              <p className="text-xs text-zinc-400">Usado para sincronizar disciplinas, prazos e notas</p>
            </div>
          </div>

          <form onSubmit={handleSaveMoodle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Usuário / CPF / Matrícula
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={moodleUser}
                  onChange={(e) => setMoodleUser(e.target.value)}
                  placeholder="Seu usuário no Virtual2"
                  required
                  className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Senha do Virtual2
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showMoodlePass ? "text" : "password"}
                  value={moodlePass}
                  onChange={(e) => setMoodlePass(e.target.value)}
                  placeholder="Atualizar senha"
                  required
                  className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowMoodlePass(!showMoodlePass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showMoodlePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {moodleMessage && (
              <div
                className={`rounded-xl border p-3 text-xs leading-relaxed ${
                  moodleMessage.type === "success"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {moodleMessage.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingMoodle}
              variant="default"
              className="w-full gap-2"
            >
              {savingMoodle ? <CogSpinner size={16} className="text-ink-950" /> : <KeyRound className="h-4 w-4" />}
              <span>Salvar Credenciais</span>
            </Button>
          </form>
        </Glass>

        {/* Seção 2: Provedor de Inteligência Artificial */}
        <Glass className="settings-panel p-6 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-white">Inteligência Artificial (LLM)</h2>
              <p className="text-xs text-zinc-400">Configure o cérebro que comanda o Tutor e o Briefing</p>
            </div>
          </div>

          <form onSubmit={handleSaveAI} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Provedor de Modelo
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
              >
                <option value="groq" className="bg-ink-950 text-white">Groq (Llama 3 70B - Ultra Rápido)</option>
                <option value="openai" className="bg-ink-950 text-white">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="gemini" className="bg-ink-950 text-white">Google Gemini (Gemini 1.5 Pro / Flash)</option>
                <option value="anthropic" className="bg-ink-950 text-white">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="ollama" className="bg-ink-950 text-white">Ollama Local (Servidor Próprio)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Chave de API (API Key)
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_... / sk-... / AIzaSy..."
                  required
                  className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {aiMessage && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {aiMessage}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingAI}
              variant="default"
              className="w-full gap-2"
            >
              {savingAI ? <CogSpinner size={16} className="text-ink-950" /> : <Sparkles className="h-4 w-4" />}
              <span>Configurar IA</span>
            </Button>
          </form>
        </Glass>
      </div>

      {/* Seção 3: Preferências de Notificações com Glisse Switch */}
      <Glass className="settings-panel p-6 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-xl space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white">Alertas & Notificações Acadêmicas</h2>
            <p className="text-xs text-zinc-400">Escolha quais avisos deseja receber em tempo real</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              key: "new_activity",
              title: "Novas Atividades Postadas",
              desc: "Avisar imediatamente quando um professor publicar tarefa no Virtual2.",
            },
            {
              key: "daily_briefing",
              title: "Briefing Matinal com IA",
              desc: "Receber o resumo diário de estudos às 07:00 da manhã.",
            },
            {
              key: "deadline_7d",
              title: "Aviso de 7 Dias",
              desc: "Lembrete prévio para atividades com prazo na semana seguinte.",
            },
            {
              key: "deadline_3d",
              title: "Aviso de 3 Dias",
              desc: "Alerta moderado de aproximação de entrega.",
            },
            {
              key: "deadline_1d",
              title: "Aviso de 24 Horas",
              desc: "Alerta crítico para entregas de amanhã.",
            },
            {
              key: "deadline_6h",
              title: "Aviso de 6 Horas",
              desc: "Contagem regressiva urgente para entrega de hoje.",
            },
          ].map((item) => (
            <Glass
              key={item.key}
              className="notification-pref flex items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>

              <Switch
                checked={notifSettings[item.key as keyof typeof notifSettings] as boolean}
                onCheckedChange={(checked) => handleToggleNotif(item.key, checked)}
                aria-label={item.title}
              />
            </Glass>
          ))}
        </div>
      </Glass>
    </div>
  );
}
