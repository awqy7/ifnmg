"use client";

import { useRef, useEffect, useState } from "react";
import { BookOpen, CheckSquare, Home, Menu, MessageSquare } from "lucide-react";
import { ViewType } from "@/components/dashboard/Dashboard";

interface MobileBottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenMenu: () => void;
}

const mainItems: Array<{
  id: ViewType;
  label: string;
  icon: typeof Home;
  badge?: string;
  disabled?: boolean;
}> = [
  { id: "home", label: "Início", icon: Home },
  { id: "atividades", label: "Tarefas", icon: CheckSquare },
  { id: "cursos", label: "Materias", icon: BookOpen },
  { id: "chat", label: "Chat IA", icon: MessageSquare },
];

export default function MobileBottomNav({
  currentView,
  onNavigate,
  onOpenMenu,
}: MobileBottomNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [tapIndex, setTapIndex] = useState<number | null>(null);

  // Calculate pill position based on active tab
  useEffect(() => {
    if (!navRef.current) return;
    const buttons = navRef.current.querySelectorAll("[data-nav-btn]");
    const activeIdx = mainItems.findIndex((item) => item.id === currentView);

    if (activeIdx >= 0 && buttons[activeIdx]) {
      const btn = buttons[activeIdx] as HTMLElement;
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - navRect.left + 4,
        width: btnRect.width - 8,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [currentView]);

  // Tap feedback
  const handleTap = (idx: number) => {
    setTapIndex(idx);
    setTimeout(() => setTapIndex(null), 150);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
      aria-label="Navegacao principal"
      style={{
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Glass morphism container */}
      <div className="relative mx-2 mb-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.08] shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
        <div ref={navRef} className="relative flex items-center justify-around px-1 pt-1.5 pb-2">
          {/* Sliding pill indicator */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-xl bg-white/[0.08] border border-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              opacity: pillStyle.opacity,
            }}
          />

          {mainItems.map((item, idx) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            const isDisabled = item.disabled;
            const isTapped = tapIndex === idx;

            return (
              <button
                key={item.id}
                type="button"
                data-nav-btn
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  handleTap(idx);
                  onNavigate(item.id);
                }}
                aria-current={active ? "page" : undefined}
                className={`relative z-10 flex flex-col items-center justify-center gap-0.5 w-16 h-14 transition-all duration-300 ease-out ${
                  isDisabled
                    ? "text-neutral-500/50 cursor-not-allowed"
                    : active
                    ? "text-white"
                    : "text-neutral-500 active:text-neutral-300"
                } ${isTapped ? "scale-90" : "scale-100"}`}
                title={isDisabled ? "Em breve" : item.label}
              >
                <div className="relative">
                  <Icon
                    className={`w-[22px] h-[22px] transition-all duration-300 ease-out ${
                      active ? "stroke-[2.2px]" : "stroke-[1.5px]"
                    }`}
                    aria-hidden="true"
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2.5 text-[7px] font-bold px-1 py-px rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700/60">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium transition-all duration-300 ${
                    active ? "opacity-100 translate-y-0" : "opacity-60 -translate-y-px"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* "Mais" button */}
          <button
            type="button"
            onClick={() => {
              handleTap(mainItems.length);
              onOpenMenu();
            }}
            className="relative z-10 flex flex-col items-center justify-center gap-0.5 w-16 h-14 text-neutral-500 active:text-neutral-300 transition-all duration-300"
            aria-label="Abrir todas as opcoes"
          >
            <Menu className="w-[22px] h-[22px] stroke-[1.5px]" aria-hidden="true" />
            <span className="text-[10px] font-medium opacity-60">Mais</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
