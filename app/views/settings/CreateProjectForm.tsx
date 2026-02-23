"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { tw } from "@/lib/constants";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";

export default function CreateProjectForm() {
  const createProject = useAppStore((state) => state.createProject);
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);
  const setView = useAppStore((state) => state.setView);
  const [projectName, setProjectName] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectBudget, setProjectBudget] = useState(240);
  const [projectFocus, setProjectFocus] = useState("");
  const [projectCreationPath, setProjectCreationPath] = useState<"manual" | "ai">("manual");
  const [formErrors, setFormErrors] = useState<{ name?: string; goal?: string }>({});

  const handleCreateProject = () => {
    const errors: { name?: string; goal?: string } = {};
    if (!projectName.trim()) errors.name = "Project name is required";
    if (!projectGoal.trim()) errors.goal = "Project goal is required";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const clampedBudget = Math.max(15, Math.min(720, projectBudget || 240));
    const project = createProject({
      name: projectName.trim(),
      goal: projectGoal.trim(),
      constraints: {
        timeBudgetMinutes: clampedBudget,
        focusNotes: projectFocus.trim() || undefined,
      },
    });
    setSelectedProject(project.id);
    setView("plan");
    setProjectName("");
    setProjectGoal("");
    setProjectFocus("");
  };

  return (
    <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
      <h2 className="text-2xl">Create a project</h2>
      <p className="text-sm text-[var(--muted)]">
        Anchor your day around one project. The plan follows the project.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            projectCreationPath === "manual"
              ? "border-[var(--accent)] bg-[rgba(249,115,22,0.08)]"
              : "border-[var(--border-medium)] bg-white"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Manual setup
          </p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Fill out the project details yourself and start planning right away.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-medium)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Fast start
          </div>
          <button
            type="button"
            onClick={() => setProjectCreationPath("manual")}
            className="mt-4 rounded-full border border-[var(--border-medium)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
          >
            Use manual
          </button>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            projectCreationPath === "ai"
              ? "border-[var(--accent)] bg-[rgba(249,115,22,0.08)]"
              : "border-[var(--border-medium)] bg-white"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            AI-assisted
          </p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Talk through your idea first, then promote it to a project.
          </p>
          <button
            type="button"
            onClick={() => {
              setProjectCreationPath("ai");
              setView("brainstorm");
              setTimeout(() => document.getElementById("brainstorm-input")?.focus(), 0);
            }}
            className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow transition hover:-translate-y-0.5"
          >
            Go to drawing board
          </button>
        </div>
      </div>

      {projectCreationPath === "manual" && (
        <div className="grid gap-4 md:grid-cols-2 items-start">
          <div className="grid gap-3">
            <label className={tw.label}>
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name-input"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              className={`${tw.input} ${formErrors.name ? "border-red-400" : "border-transparent"}`}
            />
            {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
          </div>
          <div className="grid gap-3">
            <label className={tw.label}>
              Daily time <span className="text-[var(--muted)]/70">(minutes)</span>
            </label>
            <input
              type="number"
              min={15}
              max={720}
              inputMode="numeric"
              pattern="[0-9]*"
              value={projectBudget}
              onFocus={(e) => e.target.select()}
              onKeyDown={blockNonNumericKey}
              onPaste={blockNonNumericPaste}
              onChange={(event) => setProjectBudget(Number(event.target.value || 0))}
              className={tw.input}
            />
          </div>
          <div className="grid gap-3 md:col-span-2">
            <label className={tw.label}>
              Project goal <span className="text-red-400">*</span>
            </label>
            <textarea
              value={projectGoal}
              onChange={(event) => setProjectGoal(event.target.value)}
              rows={3}
              className={`${tw.input} ${formErrors.goal ? "border-red-400" : "border-transparent"}`}
            />
            {formErrors.goal && <p className="text-xs text-red-500">{formErrors.goal}</p>}
          </div>
          <div className="grid gap-3 md:col-span-2">
            <label className={tw.label}>Focus notes</label>
            <textarea
              value={projectFocus}
              onChange={(event) => setProjectFocus(event.target.value)}
              rows={2}
              className={tw.input}
            />
          </div>
          <button
            onClick={handleCreateProject}
            className="w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-0.5"
          >
            Create project
          </button>
        </div>
      )}
    </section>
  );
}
