"use client";

import { useCallback, useState } from "react";
import { isoToday, formatMinutes } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { DailyPlan, Task } from "@/lib/types";
import {
  selectActivePlan,
  selectPlanTasks,
  selectProjectMilestones,
} from "@/lib/selectors";

type AiTask = {
  title: string;
  description?: string;
  estimateMinutes: number;
};

type AiPromptState = {
  mode: "regenerate" | "budgetFull";
  pinnedCount: number;
  unpinnedCount: number;
  remainingAppend: number;
  remainingReplace: number;
  remainingReplaceAll: number;
  removeTaskIds: string[];
  removeAllTaskIds: string[];
};

type GenerateOptions = {
  notes: string;
  skipMilestonePrompt?: boolean;
  onRequireMilestonePrompt?: () => void;
  setShouldScrollToRegenMessage?: (value: boolean) => void;
};

export default function useAiGeneration(projectId?: string, milestoneId?: string) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiScopeWarning, setAiScopeWarning] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<AiPromptState | null>(null);
  const [regenBudgetMessage, setRegenBudgetMessage] = useState<string | null>(null);

  const ensurePlan = useCallback(() => {
    const state = useAppStore.getState();
    if (!projectId) return;
    const selectedDate = state.ui.selectedDate || isoToday();
    const existing = selectActivePlan(state, projectId, selectedDate);
    if (existing) return;
    const plan: DailyPlan = {
      id: crypto.randomUUID(),
      projectId,
      date: selectedDate,
      taskIds: [],
      timeBudgetOverrideMinutes: undefined,
      createdAt: new Date().toISOString(),
    };
    state.upsertDailyPlan(plan);
  }, [projectId]);

  const buildAiScope = useCallback(
    (planTasks: Task[]) => {
      const scopeMilestoneId = milestoneId;
      const scopeTasks = planTasks.filter(
        (task) =>
          task.source === "ai" &&
          (scopeMilestoneId ? task.milestoneId === scopeMilestoneId : true),
      );
      return { scopeMilestoneId, scopeTasks };
    },
    [milestoneId],
  );

  const computeRemainingBudget = useCallback((budget: number, totalPlanned: number, removedEstimate: number) =>
    Math.max(0, (budget || 0) - (totalPlanned - removedEstimate)), []);

  const runAiGeneration = useCallback(
    async (remainingBudget: number, removeTaskIds: string[], notes: string) => {
      if (!projectId) return;
      const state = useAppStore.getState();
      const selectedProject = state.projects.find((project) => project.id === projectId);
      if (!selectedProject) return;
      if (remainingBudget <= 0) return;

      const selectedDate = state.ui.selectedDate || isoToday();
      if (removeTaskIds.length > 0) {
        state.removeTasks(removeTaskIds);
        state.detachTasksFromPlan(selectedDate, selectedProject.id, removeTaskIds);
        state.removeProgressEntriesForTasks(removeTaskIds);
      }
      setIsGenerating(true);
      setAiError(null);
      setAiScopeWarning(null);
      ensurePlan();
      try {
        const projectMilestones = selectProjectMilestones(state, selectedProject.id);
        const selectedMilestone = milestoneId
          ? projectMilestones.find((milestone) => milestone.id === milestoneId)
          : undefined;

        const response = await fetch("/api/ai/generate-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProject.id,
            goal: selectedProject.goal,
            projectName: selectedProject.name,
            milestoneTitle: selectedMilestone ? selectedMilestone.title : undefined,
            milestones: projectMilestones.map((milestone) => ({
              title: milestone.title,
              status: milestone.status,
            })),
            constraints: selectedProject.constraints,
            timeBudgetMinutes: remainingBudget,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.tasks) {
          throw new Error("AI response invalid");
        }
        if (data.scopeWarning?.filteredCount) {
          const count = Number(data.scopeWarning.filteredCount) || 0;
          if (count > 0) {
            setAiScopeWarning(
              `Removed ${count} task${count === 1 ? "" : "s"} that referenced other milestones.`,
            );
          }
        }
        const now = new Date().toISOString();
        const batchId = crypto.randomUUID();
        const newTasks: Task[] = (data.tasks as AiTask[]).map((task) => ({
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          milestoneId: selectedMilestone?.id,
          title: task.title,
          description: task.description,
          estimateMinutes: task.estimateMinutes,
          status: "todo",
          createdAt: now,
          source: "ai",
          aiBatchId: batchId,
          pinned: false,
        }));
        state.addTasks(newTasks);
        state.attachTasksToPlan(
          selectedDate,
          selectedProject.id,
          newTasks.map((task) => task.id),
        );
      } catch (error) {
        setAiError((error as Error).message);
      } finally {
        setIsGenerating(false);
      }
    },
    [ensurePlan, milestoneId, projectId],
  );

  const handleGenerateTasks = useCallback(
    async ({
      notes,
      skipMilestonePrompt,
      onRequireMilestonePrompt,
      setShouldScrollToRegenMessage,
    }: GenerateOptions) => {
      if (!projectId) return;
      const state = useAppStore.getState();
      const selectedProject = state.projects.find((project) => project.id === projectId);
      if (!selectedProject) return;

      const selectedDate = state.ui.selectedDate || isoToday();
      const activePlan = selectActivePlan(state, selectedProject.id, selectedDate);
      const planTaskIds = activePlan?.taskIds ?? [];
      const planTasks = selectPlanTasks(state, planTaskIds);
      const totalPlanned = planTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      const budget =
        activePlan?.timeBudgetOverrideMinutes ?? selectedProject.constraints.timeBudgetMinutes ?? 0;
      const projectMilestones = selectProjectMilestones(state, selectedProject.id);

      if (!skipMilestonePrompt && projectMilestones.length === 0) {
        onRequireMilestonePrompt?.();
        return;
      }

      setAiError(null);
      setRegenBudgetMessage(null);

      const { scopeTasks } = buildAiScope(planTasks);
      const pinnedTasks = scopeTasks.filter((task) => task.pinned);
      const unpinnedTasks = scopeTasks.filter((task) => !task.pinned);
      const removedEstimate = unpinnedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      const remainingReplace = computeRemainingBudget(budget, totalPlanned, removedEstimate);
      const removedEstimateAll = scopeTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      const remainingReplaceAll = computeRemainingBudget(budget, totalPlanned, removedEstimateAll);
      const remainingAppend = computeRemainingBudget(budget, totalPlanned, 0);
      const unpinnedAiPlanTasks = planTasks.filter(
        (task) => task.source === "ai" && !task.pinned,
      );
      const planPinnedAiCount = planTasks.filter(
        (task) => task.source === "ai" && task.pinned,
      ).length;
      const removedPlanEstimate = unpinnedAiPlanTasks.reduce(
        (sum, task) => sum + task.estimateMinutes,
        0,
      );
      const remainingPlanReplace = computeRemainingBudget(budget, totalPlanned, removedPlanEstimate);

      const pinnedMinutes = pinnedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      if (budget > 0 && scopeTasks.length > 0 && pinnedMinutes >= budget) {
        setRegenBudgetMessage(
          `Your pinned tasks already fill ${formatMinutes(budget)}. Free up time by removing a task or adjusting estimates.`,
        );
        return;
      }

      if (scopeTasks.length === 0) {
        if (remainingAppend <= 0) {
          setAiPrompt({
            mode: "budgetFull",
            pinnedCount: planPinnedAiCount,
            unpinnedCount: unpinnedAiPlanTasks.length,
            remainingAppend,
            remainingReplace: remainingPlanReplace,
            remainingReplaceAll: remainingPlanReplace,
            removeTaskIds: unpinnedAiPlanTasks.map((task) => task.id),
            removeAllTaskIds: planTasks.filter((task) => task.source === "ai").map((task) => task.id),
          });
          return;
        }
        setShouldScrollToRegenMessage?.(false);
        await runAiGeneration(remainingAppend, [], notes);
        return;
      }

      if (remainingAppend > 0 && unpinnedTasks.length === 0) {
        setShouldScrollToRegenMessage?.(false);
        await runAiGeneration(remainingAppend, [], notes);
        return;
      }

      if (remainingAppend > 0 && unpinnedTasks.length > 0) {
        setAiPrompt({
          mode: "regenerate",
          pinnedCount: pinnedTasks.length,
          unpinnedCount: unpinnedTasks.length,
          remainingAppend,
          remainingReplace,
          remainingReplaceAll,
          removeTaskIds: unpinnedTasks.map((task) => task.id),
          removeAllTaskIds: scopeTasks.map((task) => task.id),
        });
        return;
      }

      if (remainingReplace > 0) {
        setShouldScrollToRegenMessage?.(false);
        await runAiGeneration(remainingReplace, unpinnedTasks.map((task) => task.id), notes);
        return;
      }

      setAiPrompt({
        mode: "regenerate",
        pinnedCount: pinnedTasks.length,
        unpinnedCount: unpinnedTasks.length,
        remainingAppend,
        remainingReplace,
        remainingReplaceAll,
        removeTaskIds: unpinnedTasks.map((task) => task.id),
        removeAllTaskIds: scopeTasks.map((task) => task.id),
      });
    },
    [buildAiScope, computeRemainingBudget, projectId, runAiGeneration],
  );

  const handleProposeMilestones = useCallback(async () => {
    if (!projectId) return;
    const state = useAppStore.getState();
    const selectedProject = state.projects.find((project) => project.id === projectId);
    if (!selectedProject) return;

    setIsGeneratingMilestones(true);
    try {
      const response = await fetch("/api/ai/generate-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          goal: selectedProject.goal,
          projectName: selectedProject.name,
          constraints: selectedProject.constraints,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.milestones) {
        throw new Error("AI response invalid");
      }

      const generatedMilestones = data.milestones as { title: string }[];
      generatedMilestones.forEach((milestone) => {
        state.createMilestone(selectedProject.id, milestone.title);
        state.addActivity(selectedProject.id, `AI Proposed milestone: ${milestone.title}`);
      });
    } catch (error) {
      console.error("Failed to generate milestones", error);
    } finally {
      setIsGeneratingMilestones(false);
    }
  }, [projectId]);

  return {
    isGenerating,
    isGeneratingMilestones,
    aiError,
    aiScopeWarning,
    aiPrompt,
    setAiPrompt,
    regenBudgetMessage,
    setRegenBudgetMessage,
    runAiGeneration,
    handleGenerateTasks,
    handleProposeMilestones,
  };
}
