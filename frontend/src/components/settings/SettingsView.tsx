"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
    notificationsApi.getSettings().then((saved) => {
      setNotifSettings((current) => ({ ...current, ...saved } as typeof current));
    }).catch(() => {});
  }, [user?.ai_provider]);

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
      await notificationsApi.updateSettings({ [key]: next[key as keyof typeof next] });
    } catch {
      setNotifSettings(notifSettings);
    }
  };

  const enablePush = async () => {
    setEnablingPush(true);
    setPushMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Este navegador não oferece notificações push.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permissão de notificações não concedida.");
      const { public_key: publicKey } = await notificationsApi.getPushPublicKey();
      if (!publicKey) throw new Error("Notificações push ainda não estão configuradas no servidor.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = window.atob(base64);
      const applicationServerKey = Uint8Array.from(raw.split("").map((char) => char.charCodeAt(0)));
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await notificationsApi.subscribePush(subscription.toJSON());
      setPushMessage("Notificações ativadas neste dispositivo.");
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : "Não foi possível ativar notificações.");
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Settings className="w-5 h-5 text-[var(--ifnmblue)]/80" />
          <span className="text-gradient-accent">Configurações</span>
        </h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          Credenciais, provedores de IA e preferências
        </p>
      </div>

      {/* Virtual2 Credentials */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--ifnmblue)]/0.06 border border-[var(--ifnmblue)]/0.1">
              <Lock className="w-3.5 h-3.5 text-[var(--ifnmblue)]/80" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Virtual2 IFNMG</h2>
              <p className="text-[10px] text-[var(--text-tertiary)]">Credenciais de sincronização</p>
            </div>
          </div>

          {user?.moodle_connected ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--ifnmblue)]/80 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.1]">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--ifnmamber)]/80 bg-[var(--ifnmamber)]/[0.06] px-2 py-0.5 rounded-full border border-[var(--ifnmamber)]/[0.1]">
              <AlertCircle className="w-3 h-3" /> Desconectado
            </span>
          )}
        </div>

        <form onSubmit={handleSaveMoodle} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Usuário / CPF</label>
              <input
                type="text"
                value={moodleUser}
                onChange={(e) => setMoodleUser(e.target.value)}
                placeholder="Seu login no Virtual2"
                required
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--ifnmblue)]/30 transition-colors"
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
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--ifnmblue)]/30 transition-colors"
              />
            </div>
          </div>

          {moodleMessage && (
            <div
              className={`p-2.5 rounded-lg text-[11px] ${
                moodleMessage.type === "success"
                  ? "bg-[var(--ifnmgreen)]/[0.06] border border-[var(--ifnmgreen)]/[0.1] text-[var(--ifnmgreen)]/80"
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
            <Button
              type="submit"
              disabled={savingMoodle}
              variant="default"
              size="sm"
              className="flex items-center gap-1.5"
            >
              {savingMoodle ? <CogSpinner size={14} className="text-white" /> : "Conectar"}
            </Button>
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
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--ifnmgreen)]/30 transition-colors"
              >
                <option value="groq">Groq (Padrão)</option>
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
                className="w-full bg-white/[0.03] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--ifnmblue)]/30 transition-colors"
              />
            </div>
          </div>

          {aiMessage && (
            <div className="p-2.5 rounded-lg text-[11px] bg-[var(--ifnmgreen)]/[0.06] border border-[var(--ifnmgreen)]/[0.1] text-[var(--ifnmgreen)]/80">
              {aiMessage}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={savingAI || !apiKey}
              variant="default"
              size="sm"
              className="flex items-center gap-1.5"
            >
              {savingAI ? <CogSpinner size={14} className="text-white" /> : "Salvar"}
            </Button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
          <div className="p-1.5 rounded-lg bg-[var(--ifnmamber)]/[0.06] border border-[var(--ifnmamber)]/[0.1]">
            <Bell className="w-3.5 h-3.5 text-[var(--ifnmamber)]/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Notificacoes</h2>
            <p className="text-[10px] text-neutral-500">Preferencias de alertas</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { key: "new_activity", label: "Novas tarefas publicadas" },
            { key: "deadline_7d", label: "Prazo em 7 dias" },
            { key: "deadline_3d", label: "Prazo em 3 dias" },
            { key: "deadline_1d", label: "Prazo em 1 dia" },
            { key: "deadline_6h", label: "Prazo em 6 horas" },
            { key: "daily_briefing", label: "Briefing diário" },
          ].map((item) => {
            const active = notifSettings[item.key as keyof typeof notifSettings] as boolean;
            return (
              <div
                key={item.key}
                onClick={() => handleToggleNotif(item.key)}
                className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-[var(--accent)] flex items-center justify-between gap-2 cursor-pointer transition-colors select-none"
              >
                <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                <Switch
                  checked={active}
                  onCheckedChange={() => handleToggleNotif(item.key)}
                  className="pointer-events-none"
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-[var(--text-tertiary)]">
            Silenciar a partir de
            <input type="time" value={notifSettings.quiet_start} onChange={(event) => setNotifSettings((current) => ({ ...current, quiet_start: event.target.value }))} onBlur={() => notificationsApi.updateSettings({ quiet_start: notifSettings.quiet_start }).catch(() => {})} className="mt-1.5 w-full rounded-lg border border-[var(--border-strong)] bg-white/[0.03] px-3 py-2 text-xs text-white" />
          </label>
          <label className="text-xs font-medium text-[var(--text-tertiary)]">
            Retomar às
            <input type="time" value={notifSettings.quiet_end} onChange={(event) => setNotifSettings((current) => ({ ...current, quiet_end: event.target.value }))} onBlur={() => notificationsApi.updateSettings({ quiet_end: notifSettings.quiet_end }).catch(() => {})} className="mt-1.5 w-full rounded-lg border border-[var(--border-strong)] bg-white/[0.03] px-3 py-2 text-xs text-white" />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[var(--text-tertiary)]">Receba alertas mesmo com o sistema fechado.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enablePush}
            disabled={enablingPush}
            className="text-[11px]"
          >
            {enablingPush && <CogSpinner size={13} />}
            Ativar neste dispositivo
          </Button>
        </div>
        {pushMessage && <p className="rounded-lg bg-white/[0.03] p-2.5 text-[10px] text-neutral-300">{pushMessage}</p>}
      </div>
    </div>
  );
}
