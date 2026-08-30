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
  Loader2,
  RefreshCw,
} from "lucide-react";
import { notificationsApi, moodleApi } from "@/lib/api";
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

  // Fecha dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
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
            `Sincronizando dados... ${st.courses_done ? `${st.courses_done} disciplinas` : "iniciando"}`
          );
          setTimeout(poll, 2000);
        } else {
          setSyncing(false);
          if (st.error) {
            setSyncProgress("Erro na sincronização");
          } else {
            setSyncProgress(
              `Sincronizado com sucesso! ${st.courses_done || 0} disciplinas · ${st.materials || 0} materiais`
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
    // O texto de progresso é saída deste polling, não um gatilho para reiniciá-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing]);

  const handleSync = async () => {
    await triggerSync();
  };

  // Auto-sync automático no primeiro carregamento pós-login
  useEffect(() => {
    if (user?.moodle_connected && !hasAutoSynced.current && !syncing) {
      hasAutoSynced.current = true;
      handleSync();
    }
  }, [user?.moodle_connected]);

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
    <header
      className={`sticky top-0 z-30 bg-[#13131c]/80 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top)] transition-[max-height,transform,opacity] duration-300 ease-out ${
        isVisible
          ? "max-h-24 translate-y-0 opacity-100 overflow-visible"
          : "max-h-0 -translate-y-full opacity-0 overflow-hidden border-transparent"
      }`}
    >
      <div className="px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition lg:hidden shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="mobile-brand sm:hidden flex items-center gap-2 min-w-0">
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
            className="min-w-11 h-11 sm:h-10 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 transition disabled:opacity-50"
            aria-label="Sincronizar agora com o Moodle"
            title="Sincronizar agora com o Moodle"
          >
            {syncing ? <CogSpinner size={18} className="text-indigo-400" /> : <RefreshCw className="w-3.5 h-3.5 text-gray-400" />}
            <span className="hidden sm:inline">{syncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          {/* AI Tutor Quick Access */}
          <button
            disabled
            className={`mobile-ai-action ${
              !user?.moodle_connected ? "hidden sm:flex" : "flex"
            } min-w-11 h-11 sm:h-10 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-[#161622] border border-white/5 text-xs font-medium text-gray-500 cursor-not-allowed transition shadow-inner`}
            aria-label="Tutor IA em breve"
            title="Chat com IA (Em breve)"
          >
            <Sparkles className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline text-gray-500">IA</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80">
              BETA
            </span>
          </button>

          {/* Notifications Bell */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={toggleNotifications}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 relative transition"
              aria-label="Abrir notificações"
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
              <div className="absolute right-0 mt-2 w-72 sm:w-96 max-w-[calc(100vw-1rem)] bg-[#181826] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
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

      {/* Banner de Sincronização em Andamento (Mobile & Desktop) */}
      {syncing && (
        <div className="bg-indigo-950/80 border-t border-indigo-500/30 px-4 py-2 flex items-center justify-center gap-2.5 text-xs text-indigo-200 animate-in fade-in slide-in-from-top-1">
          <CogSpinner size={16} className="text-indigo-400 shrink-0" />
          <span className="font-medium">
            Sincronizando dados com o Virtual2... por favor, aguarde alguns instantes enquanto atualizamos suas matérias e prazos.
          </span>
        </div>
      )}
    </header>
  );
}
