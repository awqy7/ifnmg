"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ViewType } from "@/components/dashboard/Dashboard";
import {
  Bell,
  RefreshCw,
  Menu,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  FileText,
} from "lucide-react";
import { notificationsApi, moodleApi } from "@/lib/api";

interface TopBarProps {
  onMenuToggle: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenActivity?: (activityId: string) => void;
}

export default function TopBar({ onMenuToggle, onNavigate, onOpenActivity }: TopBarProps) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Contador de não-lidas + atualização em tempo real via evento do WebSocket
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    window.addEventListener("notif-refresh", fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notif-refresh", fetchUnread);
    };
  }, [fetchUnread]);

  // Polling do status real de sincronização no backend
  useEffect(() => {
    if (!syncing && !syncProgress?.includes("Sincronizado")) return;
    let active = true;

    const poll = async () => {
      try {
        const st = await moodleApi.getSyncStatus();
        if (!active) return;

        if (st.running) {
          setSyncProgress(
            `Sincronizando... ${st.courses_done ? `${st.courses_done} disciplinas` : "iniciando"}`
          );
          setTimeout(poll, 2000);
        } else {
          setSyncing(false);
          if (st.error) {
            setSyncProgress("Erro na sincronização");
          } else {
            setSyncProgress(
              `Sincronizado! ${st.courses_done || 0} disciplinas · ${st.materials || 0} materiais`
            );
            window.dispatchEvent(new CustomEvent("data-refresh"));
          }
          setTimeout(() => active && setSyncProgress(null), 5000);
        }
      } catch {
        if (active) {
          setTimeout(() => active && poll(), 3000);
        }
      }
    };

    poll();
    return () => { active = false; };
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress("Iniciando sincronização...");
    try {
      await moodleApi.forceSync();
      // o polling acima cuida do restante
    } catch (e: any) {
      setSyncing(false);
      setSyncProgress(e.message || "Erro ao sincronizar");
      setTimeout(() => setSyncProgress(null), 4000);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      loadNotifications();
    }
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
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {}

    setShowNotifications(false);

    if (notif.related_id && onOpenActivity) {
      onOpenActivity(notif.related_id);
    } else if (notif.related_url) {
      window.open(notif.related_url, "_blank");
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#13131c]/80 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top)]">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition lg:hidden shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="sm:hidden flex items-center gap-2 min-w-0">
            <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-sm font-bold text-white truncate">
              IFNMG <span className="text-indigo-400 font-medium">Assistente</span>
            </span>
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-xs text-gray-400">Ambiente Acadêmico Conectado</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">Virtual2 IFNMG</span>
              {user?.moodle_connected ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Online
                </span>
              ) : (
                <button
                  onClick={() => onNavigate("configuracoes")}
                  className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition shrink-0"
                >
                  <AlertCircle className="w-3 h-3" /> Conectar Virtual2
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {syncProgress && (
            <span className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg hidden md:inline-block max-w-56 truncate">
              {syncProgress}
            </span>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 transition disabled:opacity-50"
            title="Sincronizar agora com o Moodle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-400" : "text-gray-400"}`} />
            <span className="hidden sm:inline">{syncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          {/* AI Tutor Quick Access */}
          <button
            onClick={() => onNavigate("chat")}
            className={`${
              !user?.moodle_connected ? "hidden sm:flex" : "flex"
            } items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Perguntar à IA</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 relative transition"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#13131c]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-96 max-w-[calc(100vw-1rem)] bg-[#181826] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-sm text-white">Notificações</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      Nenhuma notificação no momento.
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-white/5 transition flex flex-col gap-1 cursor-pointer select-none ${
                          !notif.is_read ? "bg-indigo-600/10 border-l-2 border-indigo-500" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-gray-200 line-clamp-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{notif.title}</span>
                          </h4>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {new Date(notif.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{notif.message}</p>
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
