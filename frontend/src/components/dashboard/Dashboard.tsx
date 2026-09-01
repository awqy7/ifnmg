"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import DashboardHome from "@/components/dashboard/DashboardHome";
import ActivitiesView from "@/components/activities/ActivitiesView";
import CoursesView from "@/components/courses/CoursesView";
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
  | "chat"
  | "horarios"
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

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openChat = (courseId?: string, prompt?: string) => {
    setChatInitialCourseId(courseId);
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
    chat: <ChatView initialPrompt={chatInitialPrompt} initialCourseId={chatInitialCourseId} />,
    horarios: <ScheduleView />,
    estudo: <StudyToolsView />,
    configuracoes: <SettingsView />,
  };

  return (
    <div className="flex h-dvh bg-[var(--background)] overflow-hidden">
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
          isVisible
        />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overscroll-contain pb-24 lg:pb-0"
        >
          <div className="max-w-6xl mx-auto p-4 sm:p-5 lg:p-6">
            {/* Key forces remount → triggers view-enter animation */}
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
