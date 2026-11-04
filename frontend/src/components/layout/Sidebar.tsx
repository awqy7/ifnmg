"use client";

import { ViewType } from "@/components/dashboard/Dashboard";
import { Glass } from "glisse";
import {
  Home,
  CheckSquare,
  BookOpen,
  GraduationCap,
  MessageSquare,
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

const menuItems: { id: ViewType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "atividades", label: "Atividades", icon: CheckSquare },
  { id: "cursos", label: "Disciplinas", icon: BookOpen },
  { id: "chat", label: "Chat IA Tutor", icon: MessageSquare },
  { id: "estudo", label: "Central de Estudos", icon: Sparkles },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];

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

  return (
    <>
      {/* Backdrop para mobile */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:translate-x-0 ${
          mobileOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"
        } ${isOpen ? "lg:w-[260px]" : "lg:w-[76px]"}`}
      >
        <Glass className="flex h-full w-full flex-col border-r border-white/10 bg-ink-950/80 backdrop-blur-2xl rounded-none shadow-2xl">
          {/* Top Brand Header */}
          <div
            className={`flex h-16 shrink-0 items-center border-b border-white/[0.08] ${
              showFull ? "justify-between px-4" : "justify-center px-2"
            }`}
          >
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="flex min-w-0 items-center gap-3 text-left group"
              aria-label="IFNMG Assistente — início"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-ink-950 shadow-[0_0_15px_rgba(69,255,156,0.3)] transition-transform duration-200 group-hover:scale-105">
                <GraduationCap className="h-4 w-4" strokeWidth={2.4} />
              </span>
              {showFull && (
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold leading-tight tracking-tight text-white">
                    IFNMG
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                    Assistente IA
                  </span>
                </span>
              )}
            </button>

            {showFull && (
              <button
                onClick={onToggleDesktop}
                className="hidden h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white lg:flex"
                title={isOpen ? "Recolher menu" : "Expandir menu"}
                aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
              >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}

            {!showFull && (
              <button
                onClick={onToggleDesktop}
                className="absolute -right-3 top-[68px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-emerald-950 text-emerald-400 shadow-md transition-transform hover:scale-110 lg:flex"
                aria-label="Expandir menu"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${showFull ? "px-3" : "px-2"}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (mobileOpen) onCloseMobile();
                  }}
                  title={!showFull ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                    showFull ? "gap-3 px-3.5 py-2.5" : "justify-center px-0 py-2.5"
                  } ${
                    isActive
                      ? "border border-emerald-400/30 bg-emerald-500/15 text-white shadow-[0_4px_16px_rgba(69,255,156,0.15)]"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(69,255,156,0.8)]" />
                  )}
                  <Icon
                    className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                  {showFull && <span className="relative z-10 truncate text-xs font-semibold">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="shrink-0 border-t border-white/[0.08] p-3">
            <Glass className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xl ${
              showFull ? "justify-between" : "justify-center"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  title={!showFull ? user?.name || "Estudante" : undefined}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300"
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
                </div>
                {showFull && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {user?.name || "Estudante"}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {user?.email || "Virtual2 Conectado"}
                    </p>
                  </div>
                )}
              </div>

              {showFull && (
                <button
                  onClick={logout}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                  title="Sair do Assistente"
                  aria-label="Sair do Assistente"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </Glass>
          </div>
        </Glass>
      </aside>
    </>
  );
}
