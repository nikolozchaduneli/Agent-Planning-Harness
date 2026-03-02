"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/lib/store";
import { buildProjectHistory } from "@/lib/selectors";

export default function HistoryView() {
  const { projects, ui, tasks } = useAppStore(
    useShallow((state) => ({ projects: state.projects, ui: state.ui, tasks: state.tasks })),
  );
  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const perProjectStats = useMemo(
    () =>
      projects.map((project) => {
        const completed = tasks.filter(
          (task) => task.projectId === project.id && task.status === "done",
        ).length;
        const total = tasks.filter((task) => task.projectId === project.id).length;
        return { project, completed, total };
      }),
    [projects, tasks],
  );

  const baseDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const projectHistory = useMemo(
    () =>
      selectedProject
        ? buildProjectHistory(tasks, selectedProject.id, 10, baseDate)
        : [],
    [selectedProject, tasks, baseDate],
  );

  return (
    <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(31,45,43,0.4)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">History & analytics</h2>
          <p className="text-sm text-[var(--muted)]">
            Track completed tasks and progress over time.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {perProjectStats.map(({ project, completed, total }) => (
          <div
            key={project.id}
            className="rounded-[24px] border border-[var(--border-medium)] bg-white/90 p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {project.name}
            </p>
            <h3 className="text-xl">{completed} done</h3>
            <div className="mt-3 h-2 w-full rounded-full bg-[var(--panel)]">
              <div
                className="h-2 rounded-full bg-[var(--accent-2)]"
                style={{ width: `${total ? Math.min(100, (completed / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {!selectedProject && (
        <p className="text-sm text-[var(--muted)]">No project data yet.</p>
      )}

      {selectedProject && (() => {
        const daysWithData = projectHistory.filter((entry) => entry.total > 0);
        if (daysWithData.length === 0) {
          return (
            <div className="rounded-[24px] border border-dashed border-[rgba(31,45,43,0.2)] p-6 text-center text-sm text-[var(--muted)]">
              No history yet — complete your first task to start tracking.
            </div>
          );
        }
        return (
          <div className="grid gap-3 rounded-[24px] border border-[var(--border-medium)] bg-white/90 p-4 shadow-sm">
            <h3 className="text-lg">
              Last {daysWithData.length} day{daysWithData.length !== 1 ? "s" : ""} with
              activity
            </h3>
            <div className="grid gap-2">
              {daysWithData.map((entry) => (
                <div key={entry.date} className="flex items-center gap-3 rounded-full bg-[var(--panel)] px-4 py-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {entry.date}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(100, (entry.total / 6) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm">{entry.total} done</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
