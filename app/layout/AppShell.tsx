"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import AppHeader from "@/app/layout/AppHeader";
import LeftSidebar from "@/app/layout/LeftSidebar";
import RightSidebar from "@/app/layout/RightSidebar";
import BrainstormView from "@/app/views/BrainstormView";
import PlanView from "@/app/views/plan";
import FocusView from "@/app/views/FocusView";
import HistoryView from "@/app/views/HistoryView";
import ProjectSettingsView from "@/app/views/settings";
import OnboardingView from "@/app/views/OnboardingView";
import { VoiceRecordingProvider } from "@/app/hooks/useVoiceRecording";

const styles = {
  shell: "relative flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-[15px]",
  mainBase: "no-scrollbar flex flex-1 flex-col",
  mainOverflowBrainstorm: "overflow-hidden",
  mainOverflowDefault: "overflow-y-auto",
  contentWrap: "mx-auto w-full px-8",
};

export default function AppShell() {
  const { ui, projects } = useAppStore(
    useShallow((state) => ({ ui: state.ui, projects: state.projects })),
  );
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [showActivitySidebar, setShowActivitySidebar] = useState(true);

  const isFirstRun = projects.length === 0;

  useEffect(() => {
    if (isFirstRun) return;
    if (ui.activeView === "brainstorm") {
      setIsLeftSidebarOpen(false);
    }
  }, [ui.activeView, isFirstRun]);

  useEffect(() => {
    const handleOpenLeft = () => {
      setIsLeftSidebarOpen(true);
      setTimeout(() => {
        const select = document.getElementById("active-project-select") as
          | HTMLSelectElement
          | null;
        select?.focus();
      }, 0);
    };
    window.addEventListener("open-left-sidebar", handleOpenLeft as EventListener);
    return () => {
      window.removeEventListener("open-left-sidebar", handleOpenLeft as EventListener);
    };
  }, []);

  return (
    <VoiceRecordingProvider>
      <div className={styles.shell}>
        {!isFirstRun && (
          <LeftSidebar
            isOpen={isLeftSidebarOpen}
            onToggle={() => setIsLeftSidebarOpen((prev) => !prev)}
          />
        )}

        <main
          className={`${styles.mainBase} ${
            ui.activeView === "brainstorm"
              ? styles.mainOverflowBrainstorm
              : styles.mainOverflowDefault
          }`}
        >
          <AppHeader
            activitySidebarOpen={showActivitySidebar}
            onToggleActivity={() => setShowActivitySidebar((prev) => !prev)}
          />
          <div
            className={`${styles.contentWrap} ${
              ui.activeView === "brainstorm" ? "py-6 max-w-none" : "py-10 pb-20 max-w-5xl"
            }`}
          >
            <div
              key={ui.activeView}
              className="animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out"
            >
              {isFirstRun && <OnboardingView />}
              {!isFirstRun && ui.activeView === "brainstorm" && <BrainstormView />}
              {!isFirstRun && ui.activeView === "plan" && <PlanView />}
              {!isFirstRun && ui.activeView === "focus" && <FocusView />}
              {!isFirstRun && ui.activeView === "history" && <HistoryView />}
              {!isFirstRun && ui.activeView === "projects" && <ProjectSettingsView />}
            </div>
          </div>
        </main>

        {!isFirstRun && ui.activeView !== "brainstorm" && (
          <RightSidebar
            isOpen={showActivitySidebar}
            onToggle={() => setShowActivitySidebar((prev) => !prev)}
          />
        )}
      </div>
    </VoiceRecordingProvider>
  );
}
