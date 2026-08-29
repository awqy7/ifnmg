"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import DashboardHome from "@/components/dashboard/DashboardHome";
import ActivitiesView from "@/components/activities/ActivitiesView";
import CoursesView from "@/components/courses/CoursesView";
import GradesView from "@/components/grades/GradesView";
import CalendarView from "@/components/calendar/CalendarView";
import ChatView from "@/components/chat/ChatView";
import ScheduleView from "@/components/schedule/ScheduleView";
import StudyToolsView from "@/components/study/StudyToolsView";
import SettingsView from "@/components/settings/SettingsView";
import ActivityModal from "@/components/activities/ActivityModal";
import NotificationSocket from "@/components/NotificationSocket";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export type ViewType =
  | "home"
  | "atividades"
  | "cursos"
  | "notas"
  | "calendario"
  | "chat"
  | "horarios"
  | "estudo"
  | "configuracoes";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollTop = useRef(0);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setTopBarVisible(true);
    lastScrollTop.current = 0;
    mainRef.current?.scrollTo({ top: 0 });
  };

  const handleMainScroll = (event: React.UIEvent<HTMLElement>) => {
    const currentScrollTop = event.currentTarget.scrollTop;
    const difference = currentScrollTop - lastScrollTop.current;

    if (currentScrollTop < 16) {
      setTopBarVisible(true);
    } else if (difference > 6) {
      setTopBarVisible(false);
    } else if (difference < -6) {
      setTopBarVisible(true);
    }

    lastScrollTop.current = currentScrollTop;
  };

  const openChat = (courseId?: string, prompt?: string) => {
    void courseId;
    setChatInitialPrompt(prompt);
    setCurrentView("chat");
    setMobileMenuOpen(false);
  };

  const openActivityModal = (activityId: string) => {
    setSelectedActivityId(activityId);
  };

  const viewMap: Record<ViewType, React.ReactNode> = {
    home: (
      <DashboardHome
        onNavigate={setCurrentView}
        openChat={openChat}
        openActivity={openActivityModal}
      />
    ),
    atividades: <ActivitiesView openActivity={openActivityModal} />,
    cursos: <CoursesView openChat={openChat} />,
    notas: <GradesView />,
    calendario: <CalendarView openActivity={openActivityModal} />,
    chat: <ChatView initialPrompt={chatInitialPrompt} />,
    horarios: <ScheduleView />,
    estudo: <StudyToolsView />,
    configuracoes: <SettingsView />,
  };

  return (
    <div className="flex h-dvh bg-[#0f0f13] overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        mobileOpen={mobileMenuOpen}
        onToggleDesktop={() => setSidebarOpen((o) => !o)}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          onNavigate={handleNavigate}
          onOpenActivity={openActivityModal}
          isVisible={topBarVisible}
        />
        <main
          ref={mainRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overscroll-contain pb-20 lg:pb-0"
        >
          <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
            {viewMap[currentView]}
          </div>
        </main>
      </div>

      {/* Global Activity Viewer Modal */}
      <ActivityModal
        activityId={selectedActivityId}
        onClose={() => setSelectedActivityId(null)}
        openChatWithContext={openChat}
      />

      {/* WebSocket: notificações em tempo real + toasts */}
      <NotificationSocket />

      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
