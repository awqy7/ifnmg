"use client";

import { ViewType } from "@/components/dashboard/Dashboard";
import {
  Home,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Calendar,
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

  // No mobile o drawer abre sempre com rótulo completo; no desktop o texto
  // só aparece quando a sidebar está expandida.
  const showFull = isOpen || mobileOpen;

  const menuItems: { id: ViewType; label: string; icon: any; badge?: string; disabled?: boolean }[] = [
    { id: "home", label: "Central de Comando", icon: Home },
    { id: "atividades", label: "Atividades & Prazos", icon: CheckSquare },
    { id: "cursos", label: "Disciplinas & Acervo", icon: BookOpen },
    { id: "notas", label: "Boletim & Desempenho", icon: GraduationCap },
    { id: "calendario", label: "Calendário Acadêmico", icon: Calendar },
    { id: "horarios", label: "Grade de Horários", icon: Clock },
    { id: "chat", label: "Mentor IA", icon: MessageSquare, badge: "BETA", disabled: true },
    { id: "estudo", label: "Laboratório de Estudo", icon: Sparkles, badge: "BETA", disabled: true },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <>
      {/* Backdrop (mobile): fecha o drawer ao tocar fora */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`h-dvh bg-[#0d0d12] border-r border-white/10 flex flex-col fixed inset-y-0 left-0 z-40 w-64 transition-all duration-300 ${
          mobileOpen ? "translate-x-0 shadow-2xl shadow-black/80" : "-translate-x-full shadow-none"
        } lg:relative lg:translate-x-0 lg:transition-[width] ${
          isOpen ? "lg:w-64" : "lg:w-20"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50 border border-emerald-400/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {showFull && (
              <div className="truncate">
                <h1 className="font-extrabold text-base leading-tight text-white tracking-tight">IFNMG</h1>
                <p className="text-xs text-emerald-400 font-semibold">Assistente IA</p>
              </div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition lg:hidden"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleDesktop}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition hidden lg:block"
            title={isOpen ? "Recolher menu" : "Expandir menu"}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all relative ${
                  isDisabled
                    ? "bg-[#14141a] border border-white/5 text-zinc-600 cursor-not-allowed opacity-75 shadow-inner"
                    : isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-950/40"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
                title={isDisabled ? `${item.label} (Em breve)` : !showFull ? item.label : undefined}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isDisabled ? "text-zinc-600" : isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                {showFull && <span className="truncate text-left font-medium">{item.label}</span>}
                {item.badge && showFull && (
                  <span className={`ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${
                    item.badge === "BETA"
                      ? "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile / logout footer */}
        <div className="p-3 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 ${!showFull ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center font-bold text-sm text-emerald-300 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {showFull && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || "Estudante"}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </div>
            )}
            {showFull && (
              <button
                onClick={logout}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
