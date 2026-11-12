"use client";

import { BookOpen, CheckSquare, Home, LayoutGrid, MessageSquare } from "lucide-react";
import { ViewType } from "@/components/dashboard/Dashboard";
import { Glass } from "glisse";

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
      className="mobile-bottom-nav fixed inset-x-0 bottom-3 z-30 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden pointer-events-none"
      aria-label="Navegação móvel"
    >
      <Glass className="pointer-events-auto mx-auto flex max-w-md items-center gap-1 rounded-2xl border border-white/15 bg-ink-950/80 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95 ${
                active ? "text-white" : "text-zinc-400 active:text-zinc-200"
              }`}
              title={item.label}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-emerald-500/15 border border-emerald-400/30 shadow-[0_0_12px_rgba(185,232,106,0.2)]" />
              )}
              <Icon
                className={`relative z-10 h-5 w-5 transition-transform group-hover:scale-105 ${
                  active ? "text-emerald-400" : "text-zinc-400"
                }`}
                strokeWidth={active ? 2.3 : 1.9}
                aria-hidden="true"
              />
              <span className={`relative z-10 text-[10px] font-semibold ${active ? "text-emerald-300 font-bold" : "text-zinc-400"}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-zinc-400 transition-all duration-200 active:scale-95 hover:text-white"
          aria-label="Abrir todas as opções do menu"
          title="Mais Opções"
        >
          <LayoutGrid className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          <span className="text-[10px] font-semibold">Mais</span>
        </button>
      </Glass>
    </nav>
  );
}
