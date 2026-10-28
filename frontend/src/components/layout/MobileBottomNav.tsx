"use client";

import { BookOpen, CheckSquare, Home, LayoutGrid, MessageSquare } from "lucide-react";
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

export default function MobileBottomNav({
  currentView,
  onNavigate,
  onOpenMenu,
}: MobileBottomNavProps) {
  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-lg shadow-black/30 backdrop-blur-xl">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors duration-150 ${
                active ? "text-white" : "text-zinc-500 active:text-zinc-300"
              }`}
              title={item.label}
            >
              {active && (
                <span className="absolute inset-1 rounded-lg bg-white/[0.07]" />
              )}
              <Icon
                className={`relative z-10 h-[20px] w-[20px] ${active ? "text-accent" : ""}`}
                strokeWidth={active ? 2.2 : 1.9}
                aria-hidden="true"
              />
              <span className={`relative z-10 text-[9px] font-medium ${active ? "text-white" : "text-zinc-500"}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-zinc-500 transition-colors active:text-zinc-300"
          aria-label="Abrir todas as opções"
          title="Mais"
        >
          <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="text-[9px] font-medium opacity-70">Mais</span>
        </button>
      </div>
    </nav>
  );
}
