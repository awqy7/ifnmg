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
    { id: "home", label: "Início", icon: Home },
    { id: "atividades", label: "Atividades", icon: CheckSquare },
    { id: "cursos", label: "Disciplinas", icon: BookOpen },
    { id: "chat", label: "Chat IA", icon: MessageSquare },
    { id: "estudo", label: "Estudo", icon: Sparkles },
    { id: "configuracoes", label: "Configurações", icon: Settings },
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
        className={`h-dvh bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ${
          mobileOpen ? "translate-x-0 shadow-2xl shadow-black/60 w-64" : "-translate-x-full lg:translate-x-0"
        } lg:relative lg:w-[72px] lg:data-open`}
      >
        {/* ── Brand ── */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--ifnmgreen)] to-[var(--ifnmgreen)] flex items-center justify-center shrink-0 shadow-md shadow-[var(--ifnmgreen)]/40">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {showFull && (
              <div className="truncate">
                <h1 className="font-bold text-sm text-white tracking-tight">IFNMG</h1>
                <p className="text-[10px] text-[var(--ifnmgreen)]/70 font-medium">Assistente</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleDesktop}
            className="p-1.5 rounded-lg bg-[var(--surface-inset)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors hidden lg:block"
            title={isOpen ? "Recolher" : "Expandir"}
          >
            {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
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
                    ? "text-[var(--text-muted)] cursor-not-allowed"
                    : isActive
                      ? "text-[var(--ifnmgreen)] bg-[var(--ifnmgreen)]/[0.08] border border-[var(--ifnmgreen)]/[0.15]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
                title={isDisabled ? `${item.label} (Em breve)` : !showFull ? item.label : undefined}
                aria-label={item.label}
              >
                {/* Active indicator bar */}
                {isActive && !isDisabled && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--ifnmgreen)]/80 rounded-r-full" />
                )}

                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isDisabled
                      ? "text-[var(--text-muted)]"
                      : isActive
                      ? "text-[var(--ifnmgreen)]/80"
                      : "text-[var(--text-tertiary)]"
                  }`}
                />
                {showFull && <span className="truncate">{item.label}</span>}
                {item.badge && showFull && (
                  <span className="ml-auto text-[9px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-600">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── User / Logout ── */}
        <div className="p-2.5 border-t border-[var(--border)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-inset)] border border-[var(--border)] ${
              !showFull ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--ifnmgreen)]/0.08 border border-[var(--ifnmgreen)]/0.12 flex items-center justify-center text-xs font-semibold text-[var(--ifnmgreen)]/80 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {showFull && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-200 truncate">{user?.name || "Estudante"}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
              </div>
            )}
            {showFull && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--status-urgent)] hover:bg-[var(--status-urgent)]/[0.06] transition-colors"
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
