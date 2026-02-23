"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { selectScopedActivities } from "@/lib/selectors";
import { useShallow } from "zustand/react/shallow";

const styles = {
  wrapper:
    "no-scrollbar relative flex flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-l border-[var(--border-subtle)] bg-white/60 shadow-sm transition-[width] duration-500 ease-out",
  toggleButton:
    "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--muted)] shadow transition hover:text-[var(--ink)]",
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

  return (
    <aside
      className={`${styles.wrapper} ${
        isOpen ? "w-72 p-3" : "w-12 p-3"
      }`}
    >
      <div className={`flex ${isOpen ? "justify-end" : "justify-center"}`}>
        <button onClick={onToggle} className={styles.toggleButton}>
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
            <path d={isOpen ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
          </svg>
        </button>
      </div>
      {isOpen && (
        <>
          <div className="mb-6 mt-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--muted)]">
              Activity
            </h3>
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
      )}
    </aside>
  );
}
