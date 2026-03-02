"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";

const styles = {
  header:
    "sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--paper)]/90 px-3 py-3 backdrop-blur-md sm:gap-4 sm:py-4 sm:pl-8 sm:pr-3",
  navButton:
    "shrink-0 snap-start rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all hover:-translate-y-0.5 sm:px-5 sm:py-2 sm:text-xs",
  dateInput:
    "rounded-full border border-[var(--border-medium)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--ink)] focus:outline-none hover:bg-white transition-colors",
};

type AppHeaderProps = {
  leftSidebarOpen: boolean;
  activitySidebarOpen: boolean;
  sidebarTransitioning: boolean;
  onToggleActivity: () => void;
};

const RECORD_COMPACT_RELEASE_BUFFER_PX = 96;
const RECORD_EXPAND_SETTLE_MS = 70;
const RECORD_EXPAND_REQUIRED_SLACK_PX = 64;

export default function AppHeader({
  leftSidebarOpen,
  activitySidebarOpen,
  sidebarTransitioning,
  onToggleActivity,
}: AppHeaderProps) {
  const { ui, projects, setView, setDate } = useAppStore(
    useShallow((state) => ({
      ui: state.ui,
      projects: state.projects,
      setView: state.setView,
      setDate: state.setDate,
    })),
  );
  const isFirstRun = projects.length === 0;
  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);

  const { startRecording, stopRecording, activeRecordingField, voiceLoading, voiceError } =
    useVoiceRecording();

  const [globalTranscript, setGlobalTranscript] = useState<string | null>(null);
  const [isRecordCompact, setIsRecordCompact] = useState(false);
  const compactReleaseWidthRef = useRef<number | null>(null);
  const expandTimerRef = useRef<number | null>(null);
  const forceCompactRafRef = useRef<number | null>(null);
  const prevLeftSidebarOpenRef = useRef(leftSidebarOpen);
  const prevActivitySidebarOpenRef = useRef(activitySidebarOpen);
  const headerRef = useRef<HTMLElement | null>(null);
  const navGroupRef = useRef<HTMLDivElement | null>(null);
  const controlsGroupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!globalTranscript) return;
    window.dispatchEvent(
      new CustomEvent("global-transcript", { detail: globalTranscript }),
    );
  }, [globalTranscript]);

  const handleVoiceCapture = async () => {
    if (activeRecordingField === "global") {
      stopRecording();
      return;
    }
    await startRecording("global", (text) => setGlobalTranscript(text));
  };

  const applyVoiceToNotes = () => {
    if (!globalTranscript) return;
    if (ui.activeView !== "plan") {
      setView("plan");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("apply-plan-notes", { detail: globalTranscript }),
        );
      }, 0);
    } else {
      window.dispatchEvent(
        new CustomEvent("apply-plan-notes", { detail: globalTranscript }),
      );
    }
    setGlobalTranscript(null);
  };

  const views = useMemo(
    () => ["brainstorm", "plan", "focus", "history", "projects"] as const,
    [],
  );

  const queueForceCompact = () => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    compactReleaseWidthRef.current = null;
    if (forceCompactRafRef.current !== null) {
      window.cancelAnimationFrame(forceCompactRafRef.current);
      forceCompactRafRef.current = null;
    }
    forceCompactRafRef.current = window.requestAnimationFrame(() => {
      setIsRecordCompact(true);
      forceCompactRafRef.current = null;
    });
  };

  useEffect(() => {
    const wasOpen = prevLeftSidebarOpenRef.current;
    prevLeftSidebarOpenRef.current = leftSidebarOpen;
    const openingLeftSidebar = !wasOpen && leftSidebarOpen;
    if (!openingLeftSidebar || !activitySidebarOpen) return;

    queueForceCompact();
    return () => {
      if (forceCompactRafRef.current !== null) {
        window.cancelAnimationFrame(forceCompactRafRef.current);
        forceCompactRafRef.current = null;
      }
    };
  }, [activitySidebarOpen, leftSidebarOpen]);

  useEffect(() => {
    const wasOpen = prevActivitySidebarOpenRef.current;
    prevActivitySidebarOpenRef.current = activitySidebarOpen;
    const openingActivitySidebar = !wasOpen && activitySidebarOpen;
    if (!openingActivitySidebar) return;

    queueForceCompact();
    return () => {
      if (forceCompactRafRef.current !== null) {
        window.cancelAnimationFrame(forceCompactRafRef.current);
        forceCompactRafRef.current = null;
      }
    };
  }, [activitySidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearExpandTimer = () => {
      if (expandTimerRef.current !== null) {
        window.clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    };

    const getHeaderWidth = () => {
      const header = headerRef.current;
      if (!header) return window.innerWidth;
      return header.getBoundingClientRect().width;
    };

    const canExpand = () => {
      if (sidebarTransitioning) return false;

      const navGroup = navGroupRef.current;
      const controlsGroup = controlsGroupRef.current;
      const header = headerRef.current;
      if (!navGroup || !controlsGroup || !header) return false;

      const sameRow = Math.abs(navGroup.offsetTop - controlsGroup.offsetTop) <= 12;
      if (!sameRow) return false;

      const releaseWidth = compactReleaseWidthRef.current;
      const headerWidth = getHeaderWidth();
      if (releaseWidth !== null && headerWidth < releaseWidth) return false;

      const headerStyles = window.getComputedStyle(header);
      const headerGap =
        Number.parseFloat(headerStyles.columnGap || headerStyles.gap || "0") || 0;
      const navWidth = navGroup.getBoundingClientRect().width;
      const controlsWidth = controlsGroup.getBoundingClientRect().width;
      const requiredWidth =
        navWidth +
        controlsWidth +
        headerGap +
        (isRecordCompact ? RECORD_EXPAND_REQUIRED_SLACK_PX : 0);
      if (requiredWidth > headerWidth) return false;

      return true;
    };

    const scheduleExpandCheck = () => {
      if (expandTimerRef.current !== null) return;
      expandTimerRef.current = window.setTimeout(() => {
        expandTimerRef.current = null;
        if (!canExpand()) return;
        compactReleaseWidthRef.current = null;
        setIsRecordCompact(false);
      }, RECORD_EXPAND_SETTLE_MS);
    };

    const measureLayout = () => {
      const navGroup = navGroupRef.current;
      const controlsGroup = controlsGroupRef.current;
      if (!navGroup || !controlsGroup) return;

      const sameRow = Math.abs(navGroup.offsetTop - controlsGroup.offsetTop) <= 12;
      const headerWidth = getHeaderWidth();
      setIsRecordCompact((prev) => {
        if (!sameRow) {
          clearExpandTimer();
          compactReleaseWidthRef.current =
            headerWidth + RECORD_COMPACT_RELEASE_BUFFER_PX;
          return prev ? prev : true;
        }

        if (!prev) {
          clearExpandTimer();
          compactReleaseWidthRef.current = null;
          return prev;
        }

        const releaseWidth = compactReleaseWidthRef.current;
        if (releaseWidth !== null && headerWidth < releaseWidth) {
          clearExpandTimer();
          return prev;
        }
        if (sidebarTransitioning) {
          clearExpandTimer();
          return prev;
        }

        scheduleExpandCheck();
        return true;
      });
    };

    const scheduleMeasure = () => {
      window.requestAnimationFrame(measureLayout);
    };

    scheduleMeasure();

    const observer =
      typeof ResizeObserver !== "undefined" && headerRef.current
        ? new ResizeObserver(scheduleMeasure)
        : null;
    if (observer && headerRef.current) {
      observer.observe(headerRef.current);
    }
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      clearExpandTimer();
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [
    activitySidebarOpen,
    globalTranscript,
    isFirstRun,
    selectedProject,
    sidebarTransitioning,
    ui.activeView,
    isRecordCompact,
  ]);

  const showRecordText = !isRecordCompact && !(sidebarTransitioning && activitySidebarOpen);
  const recordButtonLabel =
    voiceLoading && activeRecordingField === "global"
      ? "Transcribing..."
      : activeRecordingField === "global"
        ? "Stop Recording"
        : "Record";

  return (
    <header ref={headerRef} className={styles.header}>
      {isFirstRun ? (
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Welcome to Task Centric Planner
        </div>
      ) : (
        <div ref={navGroupRef} className="flex min-w-0 items-center gap-2 sm:gap-4">
          <nav className="no-scrollbar flex min-w-0 max-w-[58vw] snap-x snap-mandatory gap-2 overflow-x-auto pr-1 sm:max-w-none sm:gap-3 sm:overflow-visible sm:pr-0">
            {views.map((view) => (
              <button
                key={view}
                onClick={() => setView(view)}
                className={`${styles.navButton} ${ui.activeView === view
                  ? "bg-[var(--ink)] text-white shadow-sm"
                  : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
                  }`}
              >
                {view === "brainstorm" ? (
                  <>
                    <span className="sm:hidden">Board</span>
                    <span className="hidden sm:inline">Drawing Board</span>
                  </>
                ) : view === "projects" ? (
                  ui.selectedProjectId ? "Settings" : "New Project"
                ) : (
                  view.charAt(0).toUpperCase() + view.slice(1)
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div ref={controlsGroupRef} className="ml-auto flex items-center gap-4 sm:gap-6">
        {!isFirstRun && (
          <div className="flex items-center gap-2">
            <label className="hidden text-xs font-medium text-[var(--muted)] sm:block">
              Date
            </label>
            <input
              type="date"
              value={ui.selectedDate}
              onChange={(event) => setDate(event.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}

        {!isFirstRun && selectedProject && ui.activeView !== "brainstorm" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleVoiceCapture}
                aria-label={recordButtonLabel}
                title={recordButtonLabel}
                className={`relative flex h-9 items-center justify-center rounded-full border text-xs font-bold shadow-sm transition hover:-translate-y-0.5 ${showRecordText ? "gap-2 px-4" : "w-9"
                  } ${activeRecordingField === "global"
                    ? "animate-pulse border-red-500 bg-red-50 text-red-600"
                    : "border-[var(--border-medium)] bg-white text-[var(--ink)]"
                  }`}
              >
                {activeRecordingField === "global" && (
                  <>
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-600" />
                  </>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                {showRecordText && <span>{recordButtonLabel}</span>}
              </button>
              {!activitySidebarOpen && !sidebarTransitioning && (
                <button
                  onClick={onToggleActivity}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white p-0 text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
                  title="Show activity"
                  aria-label="Show activity"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              )}
              {globalTranscript && (
                <button
                  onClick={applyVoiceToNotes}
                  className="rounded-full bg-[var(--accent)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow transition hover:-translate-y-0.5"
                  title="Appends the recorded transcript to your daily plan notes"
                >
                  Add to plan notes
                </button>
              )}
            </div>
            {voiceError && <p className="text-xs text-red-600">{voiceError}</p>}
          </div>
        )}

        {!isFirstRun &&
          ui.activeView !== "brainstorm" &&
          !selectedProject &&
          !activitySidebarOpen &&
          !sidebarTransitioning && (
            <button
              onClick={onToggleActivity}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white p-0 text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
              title="Show activity"
              aria-label="Show activity"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          )}
      </div>
    </header>
  );
}
