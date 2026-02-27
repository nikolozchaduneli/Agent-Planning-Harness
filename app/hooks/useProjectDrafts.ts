"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { useAppStore } from "@/lib/store";

type Draft = {
  name: string;
  goal: string;
  constraints: { timeBudgetMinutes: number; focusNotes?: string };
};

type DraftPatch = {
  name?: string;
  goal?: string;
  constraints?: { timeBudgetMinutes?: number; focusNotes?: string };
};

const MIN_PROJECT_BUDGET_MINUTES = 15;
const MAX_PROJECT_BUDGET_MINUTES = 720;

const clampProjectBudgetMinutes = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.max(
    MIN_PROJECT_BUDGET_MINUTES,
    Math.min(MAX_PROJECT_BUDGET_MINUTES, rounded),
  );
};

export default function useProjectDrafts(selectedProject: Project | undefined) {
  const updateProject = useAppStore((state) => state.updateProject);

  const [projectDrafts, setProjectDrafts] = useState<Record<string, Draft>>({});
  const [dirtyProjectIds, setDirtyProjectIds] = useState<Record<string, boolean>>({});

  const buildProjectDraft = (project: Project | undefined): Draft => ({
    name: project?.name || "",
    goal: project?.goal || "",
    constraints: {
      timeBudgetMinutes: project?.constraints.timeBudgetMinutes ?? 0,
      focusNotes: project?.constraints.focusNotes || "",
    },
  });

  const activeProjectDraft = selectedProject
    ? projectDrafts[selectedProject.id] ?? buildProjectDraft(selectedProject)
    : null;

  const isProjectDirty = selectedProject ? !!dirtyProjectIds[selectedProject.id] : false;
  const isAnyProjectDirty = useMemo(
    () => Object.values(dirtyProjectIds).some(Boolean),
    [dirtyProjectIds],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isAnyProjectDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAnyProjectDirty]);

  const updateProjectDraft = (patch: DraftPatch) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setProjectDrafts((prev) => {
      const base = prev[projectId] ?? buildProjectDraft(selectedProject);
      const next = {
        ...base,
        ...patch,
        constraints: { ...base.constraints, ...patch.constraints },
      };
      return { ...prev, [projectId]: next };
    });
    setDirtyProjectIds((prev) => ({ ...prev, [projectId]: true }));
  };

  const save = () => {
    if (!selectedProject || !activeProjectDraft) return;
    const currentBudget = clampProjectBudgetMinutes(
      selectedProject.constraints.timeBudgetMinutes,
      MIN_PROJECT_BUDGET_MINUTES,
    );
    const nextBudget = clampProjectBudgetMinutes(
      activeProjectDraft.constraints.timeBudgetMinutes,
      currentBudget,
    );
    const trimmedFocusNotes = activeProjectDraft.constraints.focusNotes?.trim() || undefined;

    updateProject(selectedProject.id, {
      name: activeProjectDraft.name.trim() || selectedProject.name,
      goal: activeProjectDraft.goal.trim() || selectedProject.goal,
      constraints: {
        timeBudgetMinutes: nextBudget,
        focusNotes: trimmedFocusNotes,
      },
    });
    setProjectDrafts((prev) => ({
      ...prev,
      [selectedProject.id]: {
        ...activeProjectDraft,
        constraints: {
          ...activeProjectDraft.constraints,
          timeBudgetMinutes: nextBudget,
          focusNotes: trimmedFocusNotes,
        },
      },
    }));
    setDirtyProjectIds((prev) => ({ ...prev, [selectedProject.id]: false }));
  };

  const cancel = () => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setProjectDrafts((prev) => ({
      ...prev,
      [projectId]: buildProjectDraft(selectedProject),
    }));
    setDirtyProjectIds((prev) => ({ ...prev, [projectId]: false }));
  };

  return {
    activeProjectDraft,
    isProjectDirty,
    isAnyProjectDirty,
    updateProjectDraft,
    save,
    cancel,
  };
}
