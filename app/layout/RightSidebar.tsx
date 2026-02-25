"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { selectScopedActivities } from "@/lib/selectors";
import { useShallow } from "zustand/react/shallow";

const styles = {
  wrapper:
    "fixed inset-y-0 right-0 z-30 flex-shrink-0 overflow-visible transition-all duration-500 ease-out md:relative md:inset-auto md:z-auto",
  toggleButton:
    "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5",
  toggleButtonOpen: "shrink-0",
  aside:
    "no-scrollbar flex h-full w-full flex-col overflow-hidden bg-white/60 shadow-sm transition-all duration-500 ease-out",
};

type RightSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function RightSidebar({ isOpen, onToggle }: RightSidebarProps) {
  const [showAllActivity, setShowAllActivity] = useState(false);
  const { ui, projects, activities } = useAppStore(
    useShallow((state) => ({ ui: state.ui, projects: state.projects, activities: state.activities })),
  );

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const selectedDate = ui.selectedDate;
  const scopedActivities = useAppStore(
    useShallow((state) =>
      selectScopedActivities(state, selectedProject?.id, selectedDate, showAllActivity),
    ),
  );

  const renderToggleButton = (className: string) => (
    <button
      onClick={onToggle}
      className={`${styles.toggleButton} ${className}`}
      title={isOpen ? "Hide activity" : "Show activity"}
      aria-label={isOpen ? "Hide activity" : "Show activity"}
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
        <path d={isOpen ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
      </svg>
    </button>
  );

  return (
    <div className={`${styles.wrapper} ${isOpen ? "w-72" : "w-0"}`}>
      <aside
        className={`${styles.aside} ${
          isOpen
            ? "translate-x-0 border-l border-[var(--border-subtle)] p-3 opacity-100"
            : "translate-x-6 border-l-0 p-0 opacity-0 pointer-events-none"
        }`}
      >
        <>
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isOpen && renderToggleButton(styles.toggleButtonOpen)}
              <h3 className="pl-1 text-sm font-semibold text-[var(--muted)]">
                Activity
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-white px-1 py-0.5 text-[10px] uppercase tracking-[0.2em] shadow">
                <button
                  onClick={() => setShowAllActivity(false)}
                  className={`rounded-full px-2 py-1 ${
                    !showAllActivity ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setShowAllActivity(true)}
                  className={`rounded-full px-2 py-1 ${
                    showAllActivity ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {!selectedProject && (
              <p className="text-sm text-[var(--muted)] italic">Select a project.</p>
            )}
            {selectedProject && scopedActivities.length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                {showAllActivity
                  ? "No activity logged yet."
                  : `No activity for ${selectedDate}.`}
              </p>
            )}
            {selectedProject &&
              scopedActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                  <div className="min-w-0">
                    <p className="break-words text-[var(--ink)]">{activity.description}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </>
      </aside>
    </div>
  );
}
