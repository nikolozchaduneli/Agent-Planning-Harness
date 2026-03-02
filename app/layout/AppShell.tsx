"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  shell: "relative flex h-screen w-screen overflow-hidden bg-[var(--paper)] text-[15px]",
  mainBase: "flex min-w-0 flex-1 flex-col overflow-hidden",
  contentViewportBase: "min-h-0 flex-1",
  contentViewportBrainstorm: "overflow-hidden",
  contentViewportDefault: "overflow-y-auto",
  contentInnerBase: "mx-auto w-full px-4 sm:px-6 lg:px-8",
  contentInnerBrainstorm: "h-full max-w-none py-6",
  contentInnerDefault: "max-w-5xl py-10 pb-20",
};

export default function AppShell() {
  const { ui, projects, activities } = useAppStore(
    useShallow((state) => ({
      ui: state.ui,
      projects: state.projects,
      activities: state.activities,
    })),
  );
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [showActivitySidebar, setShowActivitySidebar] = useState(true);
  const [leftSidebarTransitioning, setLeftSidebarTransitioning] = useState(false);
  const [activitySidebarTransitioning, setActivitySidebarTransitioning] = useState(false);
  const leftSidebarTransitionTimerRef = useRef<number | null>(null);
  const activitySidebarTransitionTimerRef = useRef<number | null>(null);
  const [manualActivitySidebarByProject, setManualActivitySidebarByProject] = useState<
    Record<string, true>
  >({});

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = ui.themeScheme;
  }, [ui.themeScheme]);

  const isFirstRun = projects.length === 0;
  const selectedProjectActivityCount = useMemo(() => {
    if (!ui.selectedProjectId) return 0;
    return activities.filter((activity) => activity.projectId === ui.selectedProjectId).length;
  }, [activities, ui.selectedProjectId]);
  const hasManualActivityPreference =
    !!ui.selectedProjectId && !!manualActivitySidebarByProject[ui.selectedProjectId];
  const shouldAutoCollapseActivitySidebar =
    !!ui.selectedProjectId &&
    selectedProjectActivityCount === 0 &&
    !hasManualActivityPreference;
  const isActivitySidebarOpen = showActivitySidebar && !shouldAutoCollapseActivitySidebar;
  const startLeftSidebarTransition = () => {
    if (leftSidebarTransitionTimerRef.current !== null) {
      window.clearTimeout(leftSidebarTransitionTimerRef.current);
    }
    setLeftSidebarTransitioning(true);
    leftSidebarTransitionTimerRef.current = window.setTimeout(() => {
      setLeftSidebarTransitioning(false);
      leftSidebarTransitionTimerRef.current = null;
    }, 650);
  };
  const startActivitySidebarTransition = () => {
    if (activitySidebarTransitionTimerRef.current !== null) {
      window.clearTimeout(activitySidebarTransitionTimerRef.current);
    }
    setActivitySidebarTransitioning(true);
    activitySidebarTransitionTimerRef.current = window.setTimeout(() => {
      setActivitySidebarTransitioning(false);
      activitySidebarTransitionTimerRef.current = null;
    }, 560);
  };
  const handleToggleLeftSidebar = () => {
    startLeftSidebarTransition();
    setIsLeftSidebarOpen((prev) => !prev);
  };
  const handleToggleActivitySidebar = () => {
    startActivitySidebarTransition();
    if (ui.selectedProjectId && !manualActivitySidebarByProject[ui.selectedProjectId]) {
      setManualActivitySidebarByProject((prev) => ({
        ...prev,
        [ui.selectedProjectId as string]: true,
      }));
    }
    if (!isActivitySidebarOpen) {
      setShowActivitySidebar(true);
      return;
    }
    setShowActivitySidebar(false);
  };

  useEffect(() => {
    return () => {
      if (leftSidebarTransitionTimerRef.current !== null) {
        window.clearTimeout(leftSidebarTransitionTimerRef.current);
      }
      if (activitySidebarTransitionTimerRef.current !== null) {
        window.clearTimeout(activitySidebarTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isFirstRun) return;
    if (ui.activeView !== "brainstorm") return;
    const closeSidebarTimeout = setTimeout(() => {
      setIsLeftSidebarOpen(false);
    }, 0);
    return () => clearTimeout(closeSidebarTimeout);
  }, [ui.activeView, isFirstRun]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => {
      if (!mq.matches) {
        setIsLeftSidebarOpen(false);
        setShowActivitySidebar(false);
      }
    };
    handleChange();
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleOpenLeft = () => {
      setIsLeftSidebarOpen((prev) => {
        if (!prev) {
          if (leftSidebarTransitionTimerRef.current !== null) {
            window.clearTimeout(leftSidebarTransitionTimerRef.current);
          }
          setLeftSidebarTransitioning(true);
          leftSidebarTransitionTimerRef.current = window.setTimeout(() => {
            setLeftSidebarTransitioning(false);
            leftSidebarTransitionTimerRef.current = null;
          }, 650);
        }
        return true;
      });
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
            onToggle={handleToggleLeftSidebar}
          />
        )}

        <main className={styles.mainBase}>
          <AppHeader
            leftSidebarOpen={isLeftSidebarOpen}
            activitySidebarOpen={isActivitySidebarOpen}
            sidebarTransitioning={leftSidebarTransitioning || activitySidebarTransitioning}
            onToggleActivity={handleToggleActivitySidebar}
          />
          <div
            className={`${styles.contentViewportBase} ${
              ui.activeView === "brainstorm"
                ? styles.contentViewportBrainstorm
                : styles.contentViewportDefault
            }`}
          >
            <div
              className={`${styles.contentInnerBase} ${
                ui.activeView === "brainstorm"
                  ? styles.contentInnerBrainstorm
                  : styles.contentInnerDefault
              }`}
            >
              <div
                key={ui.activeView}
                className={`animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out ${
                  ui.activeView === "brainstorm" ? "h-full" : ""
                }`}
              >
                {isFirstRun && ui.activeView !== "brainstorm" && <OnboardingView />}
                {ui.activeView === "brainstorm" && <BrainstormView />}
                {!isFirstRun && ui.activeView === "plan" && <PlanView />}
                {!isFirstRun && ui.activeView === "focus" && <FocusView />}
                {!isFirstRun && ui.activeView === "history" && <HistoryView />}
                {!isFirstRun && ui.activeView === "projects" && <ProjectSettingsView />}
              </div>
            </div>
          </div>
        </main>

        {!isFirstRun && ui.activeView !== "brainstorm" && (
          <RightSidebar
            isOpen={isActivitySidebarOpen}
            onToggle={handleToggleActivitySidebar}
          />
        )}
      </div>
    </VoiceRecordingProvider>
  );
}
