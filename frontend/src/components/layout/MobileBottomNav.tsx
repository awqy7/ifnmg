"use client";

import { motion } from "framer-motion";
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
      <div className="mx-auto flex max-w-md items-center gap-1 rounded-[1.4rem] border border-white/10 bg-ink-850/85 p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-200 ${
                active ? "text-ink-950" : "text-zinc-500 active:text-zinc-300"
              }`}
              title={item.label}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-pill"
                  className="absolute inset-1 rounded-[1rem] bg-accent shadow-[0_0_24px_-6px_rgba(69,255,156,0.6)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon
                className="relative z-10 h-[21px] w-[21px]"
                strokeWidth={active ? 2.6 : 1.9}
                aria-hidden="true"
              />
              <span className={`relative z-10 text-[9px] font-semibold ${active ? "opacity-100" : "opacity-70"}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-zinc-500 transition-colors active:text-zinc-300"
          aria-label="Abrir todas as opções"
          title="Mais"
        >
          <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="text-[9px] font-semibold opacity-70">Mais</span>
        </button>
      </div>
    </nav>
  );
}
