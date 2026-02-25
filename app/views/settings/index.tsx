"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { tw } from "@/lib/constants";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";
import useProjectDrafts from "@/app/hooks/useProjectDrafts";
import MilestoneListEditable from "@/app/components/MilestoneListEditable";
import CreateProjectForm from "@/app/views/settings/CreateProjectForm";

export default function ProjectSettingsView() {
  const projects = useAppStore((state) => state.projects);
  const ui = useAppStore((state) => state.ui);
  const milestones = useAppStore((state) => state.milestones);
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);
  const updateMilestone = useAppStore((state) => state.updateMilestone);
  const deleteMilestone = useAppStore((state) => state.deleteMilestone);
  const moveMilestone = useAppStore((state) => state.moveMilestone);

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const { activeProjectDraft, isProjectDirty, updateProjectDraft, save, cancel } =
    useProjectDrafts(selectedProject);

  const projectMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId === selectedProject?.id),
    [milestones, selectedProject?.id],
  );

  return (
    <div className="grid gap-6">
      {!selectedProject && <CreateProjectForm />}

      {selectedProject && activeProjectDraft && (
        <section className="grid gap-8 rounded-[28px] bg-white/80 p-8 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
            <div>
              <h2 className="text-2xl">Project Settings</h2>
              <p className="text-sm text-[var(--muted)]">
                Edit the name, goal, and constraints for your project.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={cancel}
                disabled={!isProjectDirty}
                title="Cancel changes"
                aria-label="Cancel changes"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--muted)] shadow-sm transition hover:-translate-y-0.5 hover:text-[var(--ink)] disabled:opacity-50 disabled:hover:translate-y-0"
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
                  <path d="M9 14 4 9l5-5" />
                  <path d="M20 20v-5a6 6 0 0 0-6-6H4" />
                </svg>
              </button>
              <button
                onClick={save}
                disabled={!isProjectDirty}
                title="Save changes"
                aria-label="Save changes"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
                  <path d="M6 4h10l2 2v14H6z" />
                  <path d="M8 4v6h8V4" />
                  <path d="M8 18h8" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedProject(undefined)}
                className="rounded-full border border-[var(--border-medium)] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
              >
                Start New Project
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-3">
              <label className={tw.label}>Project name</label>
              <input
                value={activeProjectDraft?.name || ""}
                onChange={(event) => updateProjectDraft({ name: event.target.value })}
                className={tw.input}
              />
            </div>
            <div className="grid gap-3 self-start">
              <label className={tw.label}>
                Daily time <span className="text-[var(--muted)]/70">(minutes)</span>
              </label>
              <input
                type="number"
                min={15}
                max={720}
                placeholder="Minutes"
                inputMode="numeric"
                pattern="[0-9]*"
                value={activeProjectDraft?.constraints.timeBudgetMinutes || ""}
                onFocus={(e) => e.target.select()}
                onKeyDown={blockNonNumericKey}
                onPaste={blockNonNumericPaste}
                onChange={(event) =>
                  updateProjectDraft({
                    constraints: {
                      timeBudgetMinutes: event.target.value === "" ? 0 : Number(event.target.value),
                    },
                  })
                }
                className={tw.input}
              />
            </div>
            <div className="grid gap-3 md:col-span-2">
              <label className={tw.label}>Project goal</label>
              <textarea
                value={activeProjectDraft?.goal || ""}
                onChange={(event) => updateProjectDraft({ goal: event.target.value })}
                rows={4}
                className={`${tw.input} min-h-[120px]`}
              />
            </div>
            <div className="grid gap-3 md:col-span-2">
              <label className={tw.label}>Focus notes</label>
              <textarea
                value={activeProjectDraft?.constraints.focusNotes || ""}
                onChange={(event) =>
                  updateProjectDraft({ constraints: { focusNotes: event.target.value } })
                }
                rows={2}
                className={tw.input}
              />
            </div>
          </div>

          <div className="mt-3 border-t border-[var(--border-subtle)] pt-5">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Milestones</h3>
              <p className="text-sm text-[var(--muted)]">Edit or delete existing milestones.</p>
            </div>
            <MilestoneListEditable
              milestones={projectMilestones}
              onMove={moveMilestone}
              onUpdate={updateMilestone}
              onDelete={deleteMilestone}
            />
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg">Existing projects</h3>
        {projects.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No projects yet.</p>
        )}
        {projects.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className="rounded-2xl border border-[var(--border-medium)] bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {project.constraints.timeBudgetMinutes} min / day
                </p>
                <h4 className="text-lg">{project.name}</h4>
                <p className="text-sm text-[var(--muted)] break-words break-all">
                  {project.goal}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
