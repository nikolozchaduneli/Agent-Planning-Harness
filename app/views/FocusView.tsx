"use client";

import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import TaskCard from "@/app/components/TaskCard";

export default function FocusView() {
  const { tasks, ui, setView, updateTaskStatus, setFocusTask } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      ui: state.ui,
      setView: state.setView,
      updateTaskStatus: state.updateTaskStatus,
      setFocusTask: state.setFocusTask,
    })),
  );
  const focusTask = tasks.find((task) => task.id === ui.focusTaskId);

  return (
    <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Focus view</h2>
          <p className="text-sm text-[var(--muted)]">Lock onto one task at a time.</p>
        </div>
        <button
          onClick={() => setView("plan")}
          className="rounded-full border border-[var(--border-medium)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
        >
          Back to plan
        </button>
      </div>
      {!focusTask && (
        <p className="text-sm text-[var(--muted)]">No focus task. Pick one from the plan.</p>
      )}
      {focusTask && (
        <div className="grid gap-4 rounded-[24px] border border-[var(--border-medium)] bg-white/90 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Focus Task
          </p>
          <TaskCard
            task={focusTask}
            mode="focus"
            onStatusChange={updateTaskStatus}
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFocusTask(undefined)}
              className="rounded-full border border-[var(--border-medium)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
            >
              Clear focus
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
