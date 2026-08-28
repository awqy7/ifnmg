"use client";

import { BookOpen, CheckSquare, Home, Menu, MessageSquare } from "lucide-react";
import { ViewType } from "@/components/dashboard/Dashboard";

interface MobileBottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenMenu: () => void;
}

const mainItems: Array<{ id: ViewType; label: string; icon: typeof Home }> = [
  { id: "home", label: "Início", icon: Home },
  { id: "atividades", label: "Tarefas", icon: CheckSquare },
  { id: "cursos", label: "Matérias", icon: BookOpen },
  { id: "chat", label: "Tutor IA", icon: MessageSquare },
];

export default function MobileBottomNav({ currentView, onNavigate, onOpenMenu }: MobileBottomNavProps) {
  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-white/10 bg-[#13131c]/95 backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                active ? "text-indigo-300 bg-indigo-500/10" : "text-gray-400 active:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
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
