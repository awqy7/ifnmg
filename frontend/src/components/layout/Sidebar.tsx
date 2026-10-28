"use client";

import { ViewType } from "@/components/dashboard/Dashboard";
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
  { id: "chat", label: "Chat IA", icon: MessageSquare },
  { id: "estudo", label: "Estudo", icon: Sparkles },
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
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-white/[0.07] bg-ink-950 transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:translate-x-0 ${
          mobileOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"
        } ${isOpen ? "lg:w-[256px]" : "lg:w-[76px]"}`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/[0.07] ${
            showFull ? "justify-between px-4" : "justify-center px-2"
          }`}
        >
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex min-w-0 items-center gap-2.5 text-left"
            aria-label="IFNMG Assistente — início"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
              <GraduationCap className="h-4 w-4 text-accent" strokeWidth={2.2} />
            </span>
            {showFull && (
              <span className="min-w-0">
                <span className="block font-display text-[13px] font-semibold leading-tight text-white">
                  IFNMG
                </span>
                <span className="block text-[10px] font-medium leading-tight text-zinc-500">
                  Assistente
                </span>
              </span>
            )}
          </button>

          {showFull && (
            <button
              onClick={onToggleDesktop}
              className="hidden h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-zinc-300 lg:flex"
              title={isOpen ? "Recolher menu" : "Expandir menu"}
              aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}

          {!showFull && (
            <button
              onClick={onToggleDesktop}
              className="absolute -right-3 top-[72px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-zinc-500 transition-colors hover:text-white lg:flex"
              aria-label="Expandir menu"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 ${showFull ? "px-2.5" : "px-2"}`}>
          <div className="space-y-0.5">
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
                  className={`group relative flex w-full items-center rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                    showFull ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-2.5"
                  } ${
                    isActive
                      ? "bg-white/[0.06] text-white"
                      : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon
                    className={`relative z-10 h-[17px] w-[17px] shrink-0 ${
                      isActive ? "text-accent" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                  {showFull && <span className="relative z-10 truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`shrink-0 border-t border-white/[0.07] py-3 ${
            showFull ? "px-2.5" : "px-2"
          }`}
        >
          <div className={`flex items-center gap-2.5 ${showFull ? "px-1" : "justify-center"}`}>
            <div
              title={!showFull ? user?.name || "Estudante" : undefined}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[11px] font-semibold text-accent"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {showFull && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {user?.name || "Estudante"}
                </p>
                <p className="truncate text-[10px] text-zinc-600">{user?.email}</p>
              </div>
            )}
            {showFull && (
              <button
                onClick={logout}
                className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
