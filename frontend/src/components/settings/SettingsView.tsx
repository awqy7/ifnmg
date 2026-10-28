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
  Mail,
  Sparkles,
  Smartphone,
  KeyRound,
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
  const [moodleMessage, setMoodleMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      setAiMessage(`Erro: ${err.message || "Chave inválida"}`);
    }
    setSavingAI(false);
  };

  const handleToggleNotif = async (key: string) => {
    const next = {
      ...notifSettings,
      [key]: !notifSettings[key as keyof typeof notifSettings],
    };
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
      if (!publicKey)
        throw new Error("Notificações push ainda não estão configuradas no servidor.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = window.atob(base64);
      const applicationServerKey = Uint8Array.from(
        raw.split("").map((char) => char.charCodeAt(0))
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await notificationsApi.subscribePush(subscription.toJSON());
      setPushMessage("Notificações ativadas neste dispositivo.");
    } catch (err) {
      setPushMessage(
        err instanceof Error ? err.message : "Não foi possível ativar notificações."
      );
    } finally {
      setEnablingPush(false);
    }
  };

  const aiHasError = aiMessage?.startsWith("Erro");
  const pushHasError =
    pushMessage &&
    !pushMessage.startsWith("Notificações ativadas") &&
    !pushMessage.startsWith("Receba");
  const initials = (user?.name || "IF")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const notificationOptions = [
    { key: "new_activity", label: "Novas tarefas publicadas", hint: "Assim que aparecerem no Virtual2" },
    { key: "deadline_7d", label: "Prazo em 7 dias", hint: "Aviso antecipado para se organizar" },
    { key: "deadline_3d", label: "Prazo em 3 dias", hint: "Lembrete de aproximação" },
    { key: "deadline_1d", label: "Prazo em 1 dia", hint: "Último dia completo" },
    { key: "deadline_6h", label: "Prazo em 6 horas", hint: "Alerta de urgência" },
    { key: "daily_briefing", label: "Briefing diário", hint: "Resumo do dia gerado pela IA" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent">
            <Settings className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="eyebrow text-[9px]">Conta</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Configurações<span className="text-accent">.</span>
            </h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Credenciais, provedores de IA e preferências de notificação
        </p>
      </header>

      {/* Perfil */}
      <div className="panel-accent panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient font-display text-sm font-bold text-ink-950 shadow-glow-sm">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-white">
              {user?.name || "Estudante IFNMG"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500">
              <Mail className="h-3 w-3 shrink-0" />
              {user?.email || "sem e-mail cadastrado"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`chip ${
              user?.moodle_connected
                ? "border-accent/25 bg-accent/[0.08] text-accent"
                : "border-status-warning/25 bg-status-warning/[0.08] text-status-warning"
            }`}
          >
            {user?.moodle_connected ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {user?.moodle_connected ? "Virtual2 conectado" : "Virtual2 desconectado"}
          </span>
          <span className="chip border-white/10 bg-white/[0.03] text-zinc-400">
            <Sparkles className="h-3 w-3 text-accent" />
            {selectedProvider.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Virtual2 */}
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-sm font-semibold text-white">Virtual2 IFNMG</h2>
                <p className="text-[10px] text-zinc-500">Credenciais de sincronização</p>
              </div>
            </div>
            {user?.moodle_connected ? (
              <span className="flex items-center gap-1 rounded-full border border-accent/20 bg-accent/[0.07] px-2 py-0.5 text-[9px] font-semibold text-accent">
                <CheckCircle2 className="h-3 w-3" /> Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-status-warning/20 bg-status-warning/[0.07] px-2 py-0.5 text-[9px] font-semibold text-status-warning">
                <AlertCircle className="h-3 w-3" /> Pendente
              </span>
            )}
          </div>

          <form onSubmit={handleSaveMoodle} className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-moodle-user"
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
                >
                  Usuário / CPF
                </label>
                <input
                  id="settings-moodle-user"
                  type="text"
                  value={moodleUser}
                  onChange={(e) => setMoodleUser(e.target.value)}
                  placeholder="Seu login no Virtual2"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label
                  htmlFor="settings-moodle-pass"
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
                >
                  Senha
                </label>
                <input
                  id="settings-moodle-pass"
                  type="password"
                  value={moodlePass}
                  onChange={(e) => setMoodlePass(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>

            {moodleMessage && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-xl border p-3 text-[11px] ${
                  moodleMessage.type === "success"
                    ? "border-accent/20 bg-accent/[0.06] text-accent"
                    : "border-status-urgent/20 bg-status-urgent/[0.06] text-status-urgent"
                }`}
              >
                {moodleMessage.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {moodleMessage.text}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
              <p className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                <Shield className="h-3 w-3 text-accent/60" /> Credenciais criptografadas
              </p>
              <Button
                type="submit"
                disabled={savingMoodle}
                variant="accent"
                size="sm"
                className="shrink-0"
              >
                {savingMoodle ? <CogSpinner size={14} className="text-ink-950" /> : null}
                {user?.moodle_connected ? "Reconectar" : "Conectar"}
              </Button>
            </div>
          </form>
        </section>

        {/* IA */}
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-white/[0.07] p-4 sm:p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-400">
              <Cpu className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold text-white">Provedor de IA</h2>
              <p className="text-[10px] text-zinc-500">Configure a chave de API do tutor</p>
            </div>
          </div>

          <form onSubmit={handleSaveAI} className="space-y-4 p-4 sm:p-5">
            <div>
              <label
                htmlFor="settings-ai-provider"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              >
                Provedor
              </label>
              <select
                id="settings-ai-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 [&>option]:bg-ink-850"
              >
                <option value="groq">Groq (Padrão)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama Local</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-ai-key"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              >
                Chave de API
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  id="settings-ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua chave aqui"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3.5 text-xs text-white placeholder:text-zinc-600 transition-colors focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>

            {aiMessage && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-xl border p-3 text-[11px] ${
                  aiHasError
                    ? "border-status-urgent/20 bg-status-urgent/[0.06] text-status-urgent"
                    : "border-accent/20 bg-accent/[0.06] text-accent"
                }`}
              >
                {aiHasError ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {aiMessage}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
              <p className="text-[9px] text-zinc-600">
                A chave fica apenas no servidor do IFNMG.
              </p>
              <Button
                type="submit"
                disabled={savingAI || !apiKey}
                variant="accent"
                size="sm"
                className="shrink-0"
              >
                {savingAI ? <CogSpinner size={14} className="text-ink-950" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Notificações */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-warning/20 bg-status-warning/[0.08] text-status-warning">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold text-white">Notificações</h2>
              <p className="text-[10px] text-zinc-500">Escolha quando e como ser avisado</p>
            </div>
          </div>
          <span className="chip border-white/10 bg-white/[0.03] text-zinc-500">
            <Smartphone className="h-3 w-3" /> Push
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
          {notificationOptions.map((item) => {
            const active = notifSettings[
              item.key as keyof typeof notifSettings
            ] as boolean;
            return (
              <div
                key={item.key}
                role="switch"
                aria-checked={active}
                aria-label={item.label}
                tabIndex={0}
                onClick={() => handleToggleNotif(item.key)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  handleToggleNotif(item.key);
                }}
                className={`flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl border p-3 transition-colors focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/20 ${
                  active
                    ? "border-accent/15 bg-accent/[0.035]"
                    : "border-white/[0.06] bg-white/[0.015] hover:border-white/10"
                }`}
              >
                <div>
                  <p className={`text-[11px] font-semibold ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-600">{item.hint}</p>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={() => handleToggleNotif(item.key)}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none"
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/[0.07] p-4 sm:grid-cols-2 sm:p-5">
          <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Silenciar a partir de
            <input
              type="time"
              value={notifSettings.quiet_start}
              onChange={(event) =>
                setNotifSettings((current) => ({
                  ...current,
                  quiet_start: event.target.value,
                }))
              }
              onBlur={() =>
                notificationsApi
                  .updateSettings({ quiet_start: notifSettings.quiet_start })
                  .catch(() => {})
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white transition-colors focus:border-accent/40 focus:outline-none [color-scheme:dark]"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Retomar às
            <input
              type="time"
              value={notifSettings.quiet_end}
              onChange={(event) =>
                setNotifSettings((current) => ({
                  ...current,
                  quiet_end: event.target.value,
                }))
              }
              onBlur={() =>
                notificationsApi
                  .updateSettings({ quiet_end: notifSettings.quiet_end })
                  .catch(() => {})
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs text-white transition-colors focus:border-accent/40 focus:outline-none [color-scheme:dark]"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[10px] leading-relaxed text-zinc-600">
            Receba alertas mesmo com o sistema fechado.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enablePush}
            disabled={enablingPush}
            className="shrink-0"
          >
            {enablingPush ? <CogSpinner size={13} /> : <Bell className="h-3.5 w-3.5" />}
            Ativar neste dispositivo
          </Button>
        </div>

        {pushMessage && (
          <div
            className={`mx-4 mb-4 rounded-xl border p-3 text-[10px] sm:mx-5 sm:mb-5 ${
              pushHasError
                ? "border-status-urgent/20 bg-status-urgent/[0.06] text-status-urgent"
                : "border-accent/20 bg-accent/[0.06] text-accent"
            }`}
          >
            {pushMessage}
          </div>
        )}
      </section>
    </div>
  );
}
