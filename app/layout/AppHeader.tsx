"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";

const styles = {
  header:
    "sticky top-0 z-10 flex flex-nowrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[#f8fafc]/90 pl-8 pr-3 py-4 backdrop-blur-md",
  navButton:
    "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all hover:-translate-y-0.5",
  dateInput:
    "rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
};

type AppHeaderProps = {
  activitySidebarOpen: boolean;
  onToggleActivity: () => void;
};

export default function AppHeader({ activitySidebarOpen, onToggleActivity }: AppHeaderProps) {
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

  return (
    <header className={styles.header}>
      {isFirstRun ? (
        <div className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--muted)]">
          Welcome to Task Centric Planner
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex gap-2">
            {views.map((view) => (
              <button
                key={view}
                onClick={() => setView(view)}
                className={`${styles.navButton} ${ui.activeView === view
                    ? "bg-[var(--accent)] text-white shadow shadow-[var(--accent)]/30"
                    : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
                  }`}
              >
                {view === "brainstorm"
                  ? "drawing board"
                  : view === "projects"
                    ? "settings"
                    : view}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="flex flex-nowrap items-center gap-4">
        {!isFirstRun && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[var(--muted)]">
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
                className={`relative flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] shadow-sm transition hover:-translate-y-0.5 ${activeRecordingField === "global"
                    ? "animate-pulse border-red-500 bg-red-50 text-red-600"
                    : "border-[var(--border-medium)] bg-white text-[var(--ink)]"
                  }`}
              >
                {activeRecordingField === "global" && (
                  <span className="h-2 w-2 rounded-full bg-red-600" />
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
                {voiceLoading && activeRecordingField === "global"
                  ? "Transcribing..."
                  : activeRecordingField === "global"
                    ? "Stop Recording"
                    : "Record"}
              </button>
              {!activitySidebarOpen && (
                <button
                  onClick={onToggleActivity}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
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

        {!isFirstRun && ui.activeView !== "brainstorm" && !selectedProject && !activitySidebarOpen && (
          <button
            onClick={onToggleActivity}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
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
