"use client";

import { motion } from "framer-motion";
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
  ArrowUpRight,
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-white/[0.06] bg-ink-950/95 backdrop-blur-2xl transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:translate-x-0 ${
          mobileOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"
        } ${isOpen ? "lg:w-[268px]" : "lg:w-[84px]"}`}
      >
        {/* Marca */}
        <div className={`flex h-[76px] shrink-0 items-center border-b border-white/[0.06] ${showFull ? "justify-between px-4" : "justify-center px-2"}`}>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="IFNMG Assistente — início"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient shadow-glow-sm">
              <GraduationCap className="h-5 w-5 text-ink-950" strokeWidth={2.4} />
            </span>
            {showFull && (
              <span className="min-w-0">
                <span className="block font-display text-[15px] font-bold leading-tight tracking-tight text-white">
                  IFNMG
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-accent/80">
                  Assistente
                </span>
              </span>
            )}
          </button>

          {showFull && (
            <button
              onClick={onToggleDesktop}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition-colors hover:border-accent/30 hover:text-accent lg:flex"
              title={isOpen ? "Recolher menu" : "Expandir menu"}
              aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}

          {!showFull && (
            <button
              onClick={onToggleDesktop}
              className="absolute -right-3 top-[88px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-zinc-500 shadow-md transition-colors hover:text-accent lg:flex"
              aria-label="Expandir menu"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className={`flex-1 overflow-y-auto py-5 ${showFull ? "px-3" : "px-2.5"}`}>
          {showFull && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
              Painel
            </p>
          )}
          <div className="space-y-1">
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
                  className={`group relative flex w-full items-center rounded-2xl text-[13px] font-semibold transition-colors duration-200 ${
                    showFull ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-3"
                  } ${isActive ? "text-ink-950" : "text-zinc-500 hover:text-white"}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-2xl bg-accent shadow-[0_0_30px_-8px_rgba(69,255,156,0.6)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-2xl bg-white/[0.04] opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                  <Icon
                    className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-ink-950" : "text-zinc-500 group-hover:text-accent"
                    }`}
                    strokeWidth={isActive ? 2.6 : 2}
                  />
                  {showFull && <span className="relative z-10 truncate">{item.label}</span>}
                  {showFull && isActive && (
                    <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-ink-950/70" />
                  )}
                </button>
              );
            })}
          </div>

          {showFull && (
            <div className="mt-6">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
                Atalho
              </p>
              <button
                onClick={() => {
                  onNavigate("chat");
                  if (mobileOpen) onCloseMobile();
                }}
                className="group relative w-full overflow-hidden rounded-2xl border border-accent/20 bg-accent/[0.06] p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/[0.1]"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/15 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-center gap-2 text-[11px] font-semibold text-accent-light">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tutor IA
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="relative mt-1 text-[10px] leading-relaxed text-zinc-500">
                  Respostas com base nos seus materiais e prazos.
                </p>
              </button>
            </div>
          )}
        </nav>

        {/* Usuário */}
        <div className={`shrink-0 border-t border-white/[0.06] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${showFull ? "px-3" : "px-2.5"}`}>
          <div className={`flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-2 ${showFull ? "" : "justify-center"}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.1] text-xs font-bold text-accent">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {showFull && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-200">
                  {user?.name || "Estudante"}
                </p>
                <p className="truncate text-[10px] text-zinc-600">{user?.email}</p>
              </div>
            )}
            {showFull && (
              <button
                onClick={logout}
                className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-status-urgent/10 hover:text-status-urgent"
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
