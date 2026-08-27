"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatCourseId, setChatCourseId] = useState<string | undefined>();
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const openChat = (courseId?: string, prompt?: string) => {
    setChatCourseId(courseId);
    setChatInitialPrompt(prompt);
    setCurrentView("chat");
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
    chat: (
      <ChatView
        initialCourseId={chatCourseId}
        initialPrompt={chatInitialPrompt}
      />
    ),
    horarios: <ScheduleView />,
    estudo: <StudyToolsView />,
    configuracoes: <SettingsView />,
  };

  return (
    <div className="flex h-screen bg-[#0f0f13] overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={setCurrentView}
          onOpenActivity={openActivityModal}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
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
    </div>
  );
}
