"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { tw } from "@/lib/constants";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";
import type { ThemeScheme } from "@/lib/types";
import useProjectDrafts from "@/app/hooks/useProjectDrafts";
import MilestoneListEditable from "@/app/components/MilestoneListEditable";
import CreateProjectForm from "@/app/views/settings/CreateProjectForm";

type AiDebugMeta = {
  latencyMs?: number;
  reasoningEffortRequested?: string;
  reasoningFieldUsed?: string;
  reasoningTokens?: number;
  fallback?: boolean;
  fallbackReason?: string;
  reasoningAttemptErrors?: Array<{
    label: string;
    status: number;
    errorSnippet: string;
  }>;
};

const themeOptions: {
  id: ThemeScheme;
  label: string;
  note: string;
  swatch: [string, string, string];
}[] = [
  {
    id: "sage",
    label: "Sage",
    note: "Balanced green-blue calm for long planning sessions.",
    swatch: ["#4c8f84", "#6f9fb2", "#edf4f1"],
  },
  {
    id: "mist",
    label: "Mist",
    note: "Cool blue clarity with softer visual contrast.",
    swatch: ["#5f86a4", "#77a6a1", "#edf2f8"],
  },
  {
    id: "dawn",
    label: "Dawn",
    note: "Warm neutral focus with lower visual noise.",
    swatch: ["#8f8661", "#8fa98c", "#f6f1e6"],
  },
];

export default function ProjectSettingsView() {
  const projects = useAppStore((state) => state.projects);
  const tasks = useAppStore((state) => state.tasks);
  const ui = useAppStore((state) => state.ui);
  const milestones = useAppStore((state) => state.milestones);
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);
  const setThemeScheme = useAppStore((state) => state.setThemeScheme);
  const createMilestone = useAppStore((state) => state.createMilestone);
  const updateMilestone = useAppStore((state) => state.updateMilestone);
  const deleteMilestone = useAppStore((state) => state.deleteMilestone);
  const moveMilestone = useAppStore((state) => state.moveMilestone);
  const addActivity = useAppStore((state) => state.addActivity);

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const { activeProjectDraft, isProjectDirty, updateProjectDraft, save, cancel } =
    useProjectDrafts(selectedProject);

  const projectMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId === selectedProject?.id),
    [milestones, selectedProject?.id],
  );

  const milestonesSectionRef = useRef<HTMLDivElement | null>(null);
  const [milestoneSteeringNotes, setMilestoneSteeringNotes] = useState("");
  const [isRegeneratingMilestones, setIsRegeneratingMilestones] = useState(false);
  const [milestoneRegenError, setMilestoneRegenError] = useState<string | null>(null);
  const [milestoneRegenMessage, setMilestoneRegenMessage] = useState<string | null>(null);
  const [milestoneEditTargetId, setMilestoneEditTargetId] = useState<string | null>(null);
  const [milestoneEditToken, setMilestoneEditToken] = useState(0);

  useEffect(() => {
    const handleOpenMilestones = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail ?? "";
      if (detail) {
        setMilestoneEditTargetId(detail);
        setMilestoneEditToken(Date.now());
      }
      window.requestAnimationFrame(() => {
        milestonesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    window.addEventListener("open-settings-milestones", handleOpenMilestones as EventListener);
    return () => {
      window.removeEventListener(
        "open-settings-milestones",
        handleOpenMilestones as EventListener,
      );
    };
  }, []);

  const handleRegenerateMilestones = async () => {
    if (!selectedProject) return;
    const draft = activeProjectDraft ?? selectedProject;
    const steeringNotes = milestoneSteeringNotes.trim();

    setMilestoneRegenError(null);
    setMilestoneRegenMessage(null);
    setIsRegeneratingMilestones(true);

    try {
      const response = await fetch("/api/ai/generate-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          goal: draft.goal,
          projectName: draft.name,
          constraints: draft.constraints,
          steeringNotes: steeringNotes || undefined,
        }),
      });
      const data = (await response.json()) as {
        milestones?: { title?: string; description?: string }[];
        meta?: AiDebugMeta;
      };
      if (data.meta) {
        console.debug("[AI debug][settings milestones]", data.meta);
      }

      const generatedMilestones = (data.milestones ?? [])
        .map((milestone) => ({
          title: milestone.title?.trim() || "",
          description: milestone.description?.trim() || "",
        }))
        .filter((milestone) => milestone.title)
        .slice(0, 7);

      if (!response.ok || generatedMilestones.length === 0) {
        throw new Error("AI response invalid");
      }

      const overlapCount = Math.min(projectMilestones.length, generatedMilestones.length);
      for (let index = 0; index < overlapCount; index += 1) {
        const existing = projectMilestones[index];
        const nextMilestone = generatedMilestones[index];
        if (
          existing.title !== nextMilestone.title ||
          (existing.description || "") !== nextMilestone.description
        ) {
          updateMilestone(existing.id, nextMilestone);
        }
      }

      for (let index = overlapCount; index < generatedMilestones.length; index += 1) {
        const nextMilestone = generatedMilestones[index];
        createMilestone(selectedProject.id, nextMilestone.title, nextMilestone.description);
      }

      const extras = projectMilestones.slice(generatedMilestones.length);
      const referencedMilestoneIds = new Set(
        tasks
          .filter((task) => task.projectId === selectedProject.id && !!task.milestoneId)
          .map((task) => task.milestoneId as string),
      );
      let removedCount = 0;
      let keptCount = 0;
      extras.forEach((milestone) => {
        if (referencedMilestoneIds.has(milestone.id)) {
          keptCount += 1;
          return;
        }
        deleteMilestone(milestone.id);
        removedCount += 1;
      });

      addActivity(
        selectedProject.id,
        `Regenerated milestones${steeringNotes ? " with steering notes" : ""}.`,
      );

      const parts = [
        `Updated ${generatedMilestones.length} milestone${generatedMilestones.length === 1 ? "" : "s"}.`,
      ];
      if (removedCount > 0) {
        parts.push(`Removed ${removedCount} unreferenced old milestone${removedCount === 1 ? "" : "s"}.`);
      }
      if (keptCount > 0) {
        parts.push(`Kept ${keptCount} old milestone${keptCount === 1 ? "" : "s"} because tasks still reference them.`);
      }
      setMilestoneRegenMessage(parts.join(" "));
    } catch (error) {
      console.error("Failed to regenerate milestones", error);
      setMilestoneRegenError("Could not regenerate milestones right now. Please try again.");
    } finally {
      setIsRegeneratingMilestones(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(31,45,43,0.4)]">
        <div>
          <h2 className="text-xl">Color Scheme</h2>
          <p className="text-sm text-[var(--muted)]">
            Pick the palette that helps you stay focused.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {themeOptions.map((option) => {
            const selected = ui.themeScheme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setThemeScheme(option.id)}
                className={`grid gap-3 rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--panel)] shadow-sm"
                    : "border-[var(--border-medium)] bg-white hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    {option.label}
                  </p>
                  {selected && (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.swatch[0] }} />
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.swatch[1] }} />
                  <span
                    className="h-4 w-4 rounded-full border border-[var(--border-medium)]"
                    style={{ backgroundColor: option.swatch[2] }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-[var(--muted)]">{option.note}</p>
              </button>
            );
          })}
        </div>
      </section>

      {!selectedProject && <CreateProjectForm />}

      {selectedProject && activeProjectDraft && (
        <section className="grid gap-8 rounded-[28px] bg-white/80 p-8 shadow-[0_20px_40px_-30px_rgba(31,45,43,0.4)]">
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

          <div
            ref={milestonesSectionRef}
            className="mt-3 border-t border-[var(--border-subtle)] pt-5"
          >
            <div className="mb-4">
              <h3 className="text-lg font-medium">Milestones</h3>
              <p className="text-sm text-[var(--muted)]">
                Edit existing milestones or regenerate the list with extra guidance.
              </p>
            </div>
            <div className="mb-4 grid gap-3 rounded-2xl border border-[var(--border-medium)] bg-[var(--panel)]/65 p-4">
              <label className={tw.label}>Milestone steering prompt (optional)</label>
              <textarea
                value={milestoneSteeringNotes}
                onChange={(event) => setMilestoneSteeringNotes(event.target.value)}
                rows={3}
                placeholder="Example: Keep milestones implementation-first, avoid UI polish until the end, and include one testing milestone."
                className={tw.input}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRegenerateMilestones}
                  disabled={isRegeneratingMilestones}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="overflow-visible"
                    aria-hidden="true"
                  >
                    <path d="m5 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                    <path d="m19 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
                  </svg>
                  {isRegeneratingMilestones ? "Regenerating..." : "Regenerate Milestones"}
                </button>
                <p className="text-xs text-[var(--muted)]">
                  Uses project goal, constraints, and this extra prompt.
                </p>
              </div>
              {milestoneRegenMessage && (
                <p className="text-xs text-[var(--muted)]">{milestoneRegenMessage}</p>
              )}
              {milestoneRegenError && (
                <p className="text-xs text-red-600">{milestoneRegenError}</p>
              )}
            </div>
            <MilestoneListEditable
              key={`milestone-editor-${milestoneEditToken}`}
              milestones={projectMilestones}
              onMove={moveMilestone}
              onUpdate={updateMilestone}
              onDelete={deleteMilestone}
              autoEditMilestoneId={milestoneEditTargetId}
              highlightMilestoneId={milestoneEditTargetId}
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
