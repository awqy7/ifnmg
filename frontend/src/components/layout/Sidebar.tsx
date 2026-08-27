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
  onToggle: () => void;
}

export default function Sidebar({ currentView, onNavigate, isOpen, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();

  const menuItems: { id: ViewType; label: string; icon: any; badge?: string }[] = [
    { id: "home", label: "Visão Geral", icon: Home },
    { id: "atividades", label: "Atividades & Prazos", icon: CheckSquare },
    { id: "cursos", label: "Disciplinas & Materiais", icon: BookOpen },
    { id: "notas", label: "Boletim & Notas", icon: GraduationCap },
    { id: "calendario", label: "Calendário", icon: Calendar },
    { id: "horarios", label: "Grade de Horários", icon: Clock },
    { id: "chat", label: "Tutor IA", icon: MessageSquare, badge: "IA" },
    { id: "estudo", label: "Ferramentas de Estudo", icon: Sparkles },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <aside
      className={`h-screen bg-[#13131c] border-r border-white/10 flex flex-col transition-all duration-300 relative z-20 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {isOpen && (
            <div className="truncate">
              <h1 className="font-bold text-base leading-tight text-white">IFNMG</h1>
              <p className="text-xs text-indigo-400 font-medium">Assistente IA</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
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
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-400" : "text-gray-400"}`} />
              {isOpen && <span className="truncate">{item.label}</span>}
              {item.badge && isOpen && (
                <span className="ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile / logout footer */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 ${!isOpen ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center font-bold text-sm text-indigo-300 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "Estudante"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
          {isOpen && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
