"use client";

import { ViewType } from "@/components/dashboard/Dashboard";
import {
  Home,
  CheckSquare,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Clock,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpen: boolean;
  mobileOpen?: boolean;
  onToggleDesktop: () => void;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentView,
  onNavigate,
  isOpen,
  mobileOpen = false,
  onToggleDesktop,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const showFull = isOpen || mobileOpen;

  const menuItems: { id: ViewType; label: string; icon: any; badge?: string; disabled?: boolean }[] = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "atividades", label: "Atividades", icon: CheckSquare },
    { id: "cursos", label: "Disciplinas", icon: BookOpen },
    { id: "horarios", label: "Horarios", icon: Clock },
    { id: "chat", label: "Chat IA", icon: MessageSquare, badge: "BETA" },
    { id: "estudo", label: "Estudo", icon: Sparkles, badge: "BETA" },
    { id: "configuracoes", label: "Configuracoes", icon: Settings },
  ];

  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`h-dvh bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed inset-y-0 left-0 z-40 w-64 transition-all duration-300 ${
          mobileOpen ? "translate-x-0 shadow-2xl shadow-black/60" : "-translate-x-full shadow-none"
        } lg:relative lg:translate-x-0 lg:transition-[width] ${isOpen ? "lg:w-64" : "lg:w-[72px]"}`}
      >
        {/* Brand */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {showFull && (
              <div className="truncate">
                <h1 className="font-bold text-sm text-white tracking-tight">IFNMG</h1>
                <p className="text-[10px] text-emerald-400/70 font-medium">Assistente</p>
              </div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-500 transition-colors lg:hidden"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleDesktop}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-500 transition-colors hidden lg:block"
            title={isOpen ? "Recolher" : "Expandir"}
          >
            {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onNavigate(item.id);
                  if (mobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative ${
                  isDisabled
                    ? "text-neutral-700 cursor-not-allowed"
                    : isActive
                    ? "text-white bg-white/[0.06]"
                    : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
                }`}
                title={isDisabled ? `${item.label} (Em breve)` : !showFull ? item.label : undefined}
                aria-label={item.label}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isDisabled ? "text-neutral-700" : isActive ? "text-emerald-400/80" : "text-neutral-500"
                  }`}
                />
                {showFull && <span className="truncate text-left">{item.label}</span>}
                {item.badge && showFull && (
                  <span className="ml-auto text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-600">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-2.5 border-t border-[var(--border)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-[var(--border)] ${
              !showFull ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.12] flex items-center justify-center text-xs font-semibold text-emerald-400/80 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {showFull && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-200 truncate">{user?.name || "Estudante"}</p>
                <p className="text-[10px] text-neutral-600 truncate">{user?.email}</p>
              </div>
            )}
            {showFull && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
