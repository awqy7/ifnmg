"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import DashboardHome from "@/components/dashboard/DashboardHome";
import ActivityModal from "@/components/activities/ActivityModal";
import NotificationSocket from "@/components/NotificationSocket";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { CogSpinner } from "@/components/ui/CogSpinner";

const LazyLoading = () => (
  <div className="flex min-h-64 items-center justify-center">
    <CogSpinner size={26} className="text-accent" />
  </div>
);
const ActivitiesView = dynamic(() => import("@/components/activities/ActivitiesView"), { loading: LazyLoading });
const CoursesView = dynamic(() => import("@/components/courses/CoursesView"), { loading: LazyLoading });
const ChatView = dynamic(() => import("@/components/chat/ChatView"), { loading: LazyLoading });
const StudyToolsView = dynamic(() => import("@/components/study/StudyToolsView"), { loading: LazyLoading });
const SettingsView = dynamic(() => import("@/components/settings/SettingsView"), { loading: LazyLoading });

export type ViewType =
  | "home"
  | "atividades"
  | "cursos"
  | "chat"
  | "estudo"
  | "configuracoes";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [chatInitialCourseId, setChatInitialCourseId] = useState<string | undefined>();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const valid: ViewType[] = ["home", "atividades", "cursos", "chat", "estudo", "configuracoes"];
    const syncFromHistory = () => {
      const value = window.location.hash.replace("#", "") as ViewType;
      setCurrentView(valid.includes(value) ? value : "home");
    };
    syncFromHistory();
    window.addEventListener("hashchange", syncFromHistory);
    window.addEventListener("popstate", syncFromHistory);
    return () => {
      window.removeEventListener("hashchange", syncFromHistory);
      window.removeEventListener("popstate", syncFromHistory);
    };
  }, []);

  const handleNavigate = (view: ViewType) => {
    if (view === "chat") {
      setChatInitialPrompt(undefined);
      setChatInitialCourseId(undefined);
    }
    setCurrentView(view);
    window.history.pushState(null, "", view === "home" ? window.location.pathname : `#${view}`);
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openChat = (courseId?: string, prompt?: string) => {
    setChatInitialCourseId(courseId);
    setChatInitialPrompt(prompt);
    setCurrentView("chat");
    window.history.pushState(null, "", "#chat");
    setMobileMenuOpen(false);
  };

  const openActivityModal = (activityId: string) => {
    setSelectedActivityId(activityId);
  };

  const viewMap: Record<ViewType, React.ReactNode> = {
    home: (
      <DashboardHome
        onNavigate={handleNavigate}
        openChat={openChat}
        openActivity={openActivityModal}
      />
    ),
    atividades: <ActivitiesView openActivity={openActivityModal} />,
    cursos: <CoursesView openChat={openChat} />,
    chat: <ChatView initialPrompt={chatInitialPrompt} initialCourseId={chatInitialCourseId} />,
    estudo: <StudyToolsView />,
    configuracoes: <SettingsView />,
  };

  return (
    <div className="app-backdrop flex h-dvh overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        mobileOpen={mobileMenuOpen}
        onToggleDesktop={() => setSidebarOpen((o) => !o)}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          onNavigate={handleNavigate}
          onOpenActivity={openActivityModal}
          isVisible
          currentView={currentView}
        />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overscroll-contain pb-28 lg:pb-0"
        >
          <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
            <div key={currentView} className="view-enter">
              {viewMap[currentView]}
            </div>
          </div>
        </main>
      </div>

      <ActivityModal
        activityId={selectedActivityId}
        onClose={() => setSelectedActivityId(null)}
        openChatWithContext={openChat}
      />

      <NotificationSocket />

      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
