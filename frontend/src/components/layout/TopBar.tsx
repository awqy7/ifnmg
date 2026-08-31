"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { ViewType } from "@/components/dashboard/Dashboard";
import {
  Bell,
  Menu,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  FileText,
  RefreshCw,
} from "lucide-react";
import { moodleApi, notificationsApi } from "@/lib/api";
import { CogSpinner } from "@/components/ui/CogSpinner";

interface TopBarProps {
  onMenuToggle: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenActivity?: (activityId: string) => void;
  isVisible?: boolean;
}

export default function TopBar({ onMenuToggle, onNavigate, onOpenActivity, isVisible = true }: TopBarProps) {
  const { user } = useAuth();
  const { syncing, syncProgress, triggerSync, setSyncing, setSyncProgress } = useSync();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
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
        const isStale = !lastSync || Date.now() - lastSync > 10 * 60 * 1000;
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
      className={`sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)] pt-[env(safe-area-inset-top)] transition-all duration-300 ease-out ${
        isVisible
          ? "max-h-24 translate-y-0 opacity-100"
          : "max-h-0 -translate-y-full opacity-0 border-transparent"
      }`}
    >
      <div className="px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 transition-colors lg:hidden shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="mobile-brand sm:hidden flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 text-emerald-400/80 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              IFNMG <span className="text-emerald-400/80 font-normal">Assistente</span>
            </span>
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-[11px] text-neutral-500">Virtual2 IFNMG</p>
            <div className="flex items-center gap-2">
              {user?.moodle_connected ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/80 bg-emerald-500/[0.06] px-2 py-0.5 rounded-full border border-emerald-500/[0.1] shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <button
                  onClick={() => onNavigate("configuracoes")}
                  className="flex items-center gap-1 text-[10px] font-medium text-amber-400/80 bg-amber-500/[0.06] px-2 py-0.5 rounded-full border border-amber-500/[0.1] hover:bg-amber-500/[0.1] transition-colors shrink-0"
                >
                  <AlertCircle className="w-3 h-3" /> Conectar Virtual2
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="min-w-10 h-10 sm:h-9 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border)] text-xs font-medium text-neutral-300 transition-colors disabled:opacity-40"
            aria-label="Sincronizar dados"
            title="Sincronizar com o Virtual2"
          >
            {syncing ? (
              <CogSpinner size={16} className="text-emerald-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span className="hidden sm:inline">{syncing ? "Sincronizando" : "Sincronizar"}</span>
          </button>
          {syncProgress && (
            <span className="hidden xl:inline max-w-56 truncate text-[10px] text-neutral-500" title={syncProgress}>
              {syncProgress}
            </span>
          )}

          {/* AI Tutor Quick Access */}
          <button
            disabled
            className={`${
              !user?.moodle_connected ? "hidden sm:flex" : "flex"
            } min-w-10 h-10 sm:h-9 items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-xl bg-white/[0.02] border border-[var(--border)] text-[11px] font-medium text-neutral-600 cursor-not-allowed transition-colors`}
            aria-label="Chat IA em breve"
            title="Chat com IA (Em breve)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IA</span>
          </button>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={toggleNotifications}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border)] text-neutral-400 relative transition-colors"
              aria-label="Notificacoes"
              title="Notificacoes"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold flex items-center justify-center text-black border-[1.5px] border-[var(--background)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-emerald-400/80" />
                    <span className="font-semibold text-xs text-white">Notificacoes</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Check className="w-3 h-3" /> Marcar todas
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-5 text-center text-neutral-500 text-xs">
                      Nenhuma notificacao nova.
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors flex flex-col gap-0.5 cursor-pointer border-l-2 ${
                          !notif.is_read ? "border-l-emerald-500/40 bg-emerald-500/[0.02]" : "border-l-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[11px] font-medium text-neutral-200 line-clamp-1 flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-neutral-500 shrink-0" />
                            <span>{notif.title}</span>
                          </h4>
                          <span className="text-[9px] text-neutral-600 shrink-0">
                            {new Date(notif.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 pl-4">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
