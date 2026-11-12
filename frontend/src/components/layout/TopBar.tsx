"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { ViewType } from "@/components/dashboard/Dashboard";
import { Glass } from "glisse";
import {
  Bell,
  Menu,
  GraduationCap,
  AlertCircle,
  Sparkles,
  Check,
  FileText,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { moodleApi, notificationsApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onMenuToggle: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenActivity?: (activityId: string) => void;
  isVisible?: boolean;
  currentView?: ViewType;
}

const pageTitles: Record<ViewType, string> = {
  home: "Visão Geral",
  atividades: "Atividades & Prazos",
  cursos: "Disciplinas & Materiais",
  chat: "Tutor IA Virtual",
  estudo: "Central de Estudos",
  configuracoes: "Ajustes & Conexões",
};

export default function TopBar({
  onMenuToggle,
  onNavigate,
  onOpenActivity,
  isVisible = true,
  currentView = "home",
}: TopBarProps) {
  const { user } = useAuth();
  const { syncing, syncProgress, triggerSync, setSyncing, setSyncProgress } = useSync();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const hasAutoSynced = useRef(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.count);
    } catch {}
  }, []);

  const loadNotifications = async () => {
    try {
      const list = await notificationsApi.list();
      setNotifications(list);
    } catch {}
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowNotifications(false);
      notificationsButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showNotifications]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    window.addEventListener("notif-refresh", fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notif-refresh", fetchUnread);
    };
  }, [fetchUnread]);

  const handleSync = async () => {
    await triggerSync();
  };

  useEffect(() => {
    if (!user?.moodle_connected || hasAutoSynced.current) return;
    hasAutoSynced.current = true;

    const initializeSync = async () => {
      try {
        const status = await moodleApi.getSyncStatus();
        if (status.running) {
          setSyncProgress(status.phase === "queued" ? "Preparando sincronização..." : "Sincronizando dados...");
          setSyncing(true);
          return;
        }
        const lastSync = user.moodle_last_sync ? new Date(user.moodle_last_sync).getTime() : 0;
        const isStale = !lastSync || Date.now() - lastSync > 30 * 60 * 1000;
        if (isStale) await triggerSync();
      } catch {
        // A home continua disponível com o último snapshot local.
      }
    };

    void initializeSync();
  }, [user, setSyncProgress, setSyncing, triggerSync]);

  const toggleNotifications = () => {
    if (!showNotifications) loadNotifications();
    setShowNotifications(!showNotifications);
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.is_read) {
        await notificationsApi.markRead(notif.id);
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {}
    setShowNotifications(false);
    if (notif.related_id && onOpenActivity) {
      onOpenActivity(notif.related_id);
    } else if (notif.related_url) {
      window.open(notif.related_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ease-out ${
        isVisible
          ? "max-h-28 translate-y-0 opacity-100"
          : "max-h-0 -translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <Glass className="topbar-panel border-b border-white/10 bg-ink-950/70 backdrop-blur-2xl rounded-none shadow-sm">
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="mobile-brand flex min-w-0 items-center gap-2 sm:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="truncate font-display text-sm font-bold text-white">
                IFNMG <span className="font-medium text-emerald-400">Assistente</span>
              </span>
            </div>

            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400/90">
                  IFNMG Virtual
                </span>
                <span className="text-zinc-600">/</span>
                <h1 className="truncate font-display text-sm font-semibold text-white">
                  {pageTitles[currentView]}
                </h1>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                {user?.moodle_connected ? (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(185,232,106,0.8)]" />
                    Virtual2 Sincronizado
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate("configuracoes")}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Conectar ao Virtual2
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="h-9 px-3 gap-2 border-white/12 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white shadow-sm"
              aria-label="Sincronizar dados com o Virtual2"
              title="Sincronizar com o Virtual2"
            >
              {syncing ? (
                <CogSpinner size={14} className="text-emerald-400" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline text-xs font-semibold">
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </span>
            </Button>

            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => onNavigate("chat")}
              className={`${!user?.moodle_connected ? "hidden sm:flex" : "flex"} h-9 px-3 gap-2 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 shadow-sm`}
              aria-label="Abrir Chat IA"
              title="Abrir Chat IA"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline text-xs font-semibold">Tutor IA</span>
            </Button>

            {/* Notificações Popover */}
            <div ref={notificationsRef} className="relative">
              <button
                ref={notificationsButtonRef}
                onClick={toggleNotifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
                aria-label="Notificações"
                aria-expanded={showNotifications}
                aria-controls="notifications-panel"
                title="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-ink-950 shadow-[0_0_8px_rgba(185,232,106,0.6)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <Glass
                  id="notifications-panel"
                  aria-label="Notificações"
                  className="absolute right-0 mt-3 w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-ink-950/90 shadow-2xl backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Notificações Acadêmicas</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <Check className="h-3 w-3" /> Ler todas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-400">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${
                            !notif.is_read ? "border-l-2 border-emerald-400 bg-emerald-500/[0.04]" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 line-clamp-1">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>{notif.title}</span>
                            </h4>
                            <span className="shrink-0 text-[10px] text-zinc-500">
                              {new Date(notif.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="line-clamp-2 pl-5 text-[11px] text-zinc-400">{notif.message}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate("atividades");
                    }}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-white/[0.08] bg-white/[0.02] py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-white/[0.06]"
                  >
                    Ver todas as atividades <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </Glass>
              )}
            </div>
          </div>
        </div>

        {/* Barra de progresso de sincronização */}
        <div aria-live="polite" className="sr-only">{syncProgress || ""}</div>
        {syncing && (
          <div className="h-[2px] w-full overflow-hidden bg-white/[0.06]">
            <div className="h-full w-1/3 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-emerald-400 to-teal-400" />
          </div>
        )}
        {syncProgress && (
          <div className="truncate border-t border-white/[0.06] bg-emerald-500/[0.05] px-4 py-1.5 text-center text-[10px] font-medium text-emerald-300 sm:hidden">
            {syncProgress}
          </div>
        )}
      </Glass>
    </header>
  );
}
