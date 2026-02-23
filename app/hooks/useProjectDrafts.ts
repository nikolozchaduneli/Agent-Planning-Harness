"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function useProjectDrafts(selectedProject: Project | undefined) {
  const updateProject = useAppStore((state) => state.updateProject);

  const [projectDrafts, setProjectDrafts] = useState<Record<string, Draft>>({});
  const [dirtyProjectIds, setDirtyProjectIds] = useState<Record<string, boolean>>({});
  const prevProjectIdRef = useRef<string | undefined>(undefined);

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
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    if (prevProjectIdRef.current === projectId) return;
    prevProjectIdRef.current = projectId;

    const freshDraft = buildProjectDraft(selectedProject);
    setProjectDrafts((prev) => ({
      ...prev,
      [projectId]: freshDraft,
    }));
  }, [selectedProject]);

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
    updateProject(selectedProject.id, {
      name: activeProjectDraft.name.trim() || selectedProject.name,
      goal: activeProjectDraft.goal.trim() || selectedProject.goal,
      constraints: {
        timeBudgetMinutes: activeProjectDraft.constraints.timeBudgetMinutes,
        focusNotes: activeProjectDraft.constraints.focusNotes?.trim() || undefined,
      },
    });
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
