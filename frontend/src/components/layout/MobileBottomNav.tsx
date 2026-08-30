"use client";

import { BookOpen, CheckSquare, Home, Menu, MessageSquare } from "lucide-react";
import { ViewType } from "@/components/dashboard/Dashboard";

interface MobileBottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenMenu: () => void;
}

const mainItems: Array<{ id: ViewType; label: string; icon: typeof Home; badge?: string; disabled?: boolean }> = [
  { id: "home", label: "Início", icon: Home },
  { id: "atividades", label: "Tarefas", icon: CheckSquare },
  { id: "cursos", label: "Matérias", icon: BookOpen },
  { id: "chat", label: "Chat IA", icon: MessageSquare, badge: "BETA", disabled: true },
];

export default function MobileBottomNav({ currentView, onNavigate, onOpenMenu }: MobileBottomNavProps) {
  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-white/10 bg-[#0d0d12]/95 backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                onNavigate(item.id);
              }}
              aria-current={active ? "page" : undefined}
              className={`min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition relative ${
                isDisabled
                  ? "bg-[#14141a]/80 border border-white/5 text-zinc-600 cursor-not-allowed opacity-80"
                  : active
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-zinc-400 active:bg-white/10"
              }`}
              title={isDisabled ? "Em breve" : item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isDisabled ? "text-zinc-600" : ""}`} aria-hidden="true" />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 text-[8px] font-bold px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={isDisabled ? "text-zinc-600" : ""}>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-gray-400 active:bg-white/10"
          aria-label="Abrir todas as opções"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
