"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { selectProjectMilestones, selectActivePlan, selectPlanTasks } from "@/lib/selectors";
import { isoToday } from "@/lib/constants";
import TaskCard from "@/app/components/TaskCard";

type FocusPromptResult = {
  prompt: string;
  checklist: string[];
};

export default function FocusView() {
  const { tasks, projects, ui, setView, updateTaskStatus, setFocusTask } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      projects: state.projects,
      ui: state.ui,
      setView: state.setView,
      updateTaskStatus: state.updateTaskStatus,
      setFocusTask: state.setFocusTask,
    })),
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [promptResult, setPromptResult] = useState<FocusPromptResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const focusTask = tasks.find((task) => task.id === ui.focusTaskId);
  const project = projects.find((p) => p.id === ui.selectedProjectId);

  const handleGeneratePrompt = useCallback(async () => {
    if (!focusTask || !project) return;
    setIsGenerating(true);
    setError(null);
    setPromptResult(null);

    try {
      const state = useAppStore.getState();
      const milestones = selectProjectMilestones(state, project.id);
      const milestone = focusTask.milestoneId
        ? milestones.find((m) => m.id === focusTask.milestoneId)
        : undefined;

      const selectedDate = state.ui.selectedDate || isoToday();
      const plan = selectActivePlan(state, project.id, selectedDate);
      const planTasks = plan ? selectPlanTasks(state, plan.taskIds) : [];
      const relatedTasks = planTasks
        .filter((t) => t.id !== focusTask.id)
        .slice(0, 8)
        .map((t) => ({
          title: t.title,
          status: t.status,
          estimateMinutes: t.estimateMinutes,
          milestoneTitle: t.milestoneId
            ? milestones.find((m) => m.id === t.milestoneId)?.title
            : undefined,
        }));

      const response = await fetch("/api/ai/generate-focus-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          goal: project.goal,
          constraints: {
            timeBudgetMinutes: project.constraints.timeBudgetMinutes,
            focusNotes: project.constraints.focusNotes,
          },
          task: {
            title: focusTask.title,
            description: focusTask.description,
            estimateMinutes: focusTask.estimateMinutes,
            status: focusTask.status,
            milestoneTitle: milestone?.title,
            milestoneDescription: milestone?.description,
          },
          relatedTasks,
        }),
      });

      const data = await response.json();
      if (data.meta) console.debug("[AI debug][focus-prompt]", data.meta);

      if (!data.prompt || !data.checklist) {
        throw new Error("Invalid response from focus prompt API");
      }

      setPromptResult({ prompt: data.prompt, checklist: data.checklist });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [focusTask, project]);

  const handleCopy = useCallback(async () => {
    if (!promptResult) return;
    await navigator.clipboard.writeText(promptResult.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [promptResult]);

  return (
    <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(31,45,43,0.4)]">
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
        <div className="rounded-[24px] border border-dashed border-[rgba(31,45,43,0.2)] bg-white/70 p-6">
          <p className="text-sm text-[var(--muted)]">No focus task. Pick one from the plan.</p>
        </div>
      )}
      {focusTask && (
        <>
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
              <button
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white shadow transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate AI prompt"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-[16px] border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {promptResult && (
            <div className="grid gap-4 rounded-[24px] border border-[var(--border-medium)] bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Generated Prompt
                </p>
                <button
                  onClick={handleCopy}
                  className="rounded-full border border-[var(--border-medium)] bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[12px] bg-[var(--bg-surface)] p-4 text-sm leading-relaxed text-[var(--ink)]">
                {promptResult.prompt}
              </pre>

              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Execution Checklist
              </p>
              <ul className="grid gap-2">
                {promptResult.checklist.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--ink)]"
                  >
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--border-medium)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
