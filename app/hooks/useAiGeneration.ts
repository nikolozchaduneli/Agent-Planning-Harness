"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  description?: string | null;
  estimateMinutes: number;
  milestoneTitle?: string | null;
};

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

type AiPromptState = {
  mode: "regenerate" | "budgetFull" | "crossReplace";
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

const NEW_TASK_HIGHLIGHT_MS = 1600;
const MIN_GENERATING_VISUAL_MS = 700;

export default function useAiGeneration(projectId?: string, milestoneId?: string) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [regeneratingTaskIds, setRegeneratingTaskIds] = useState<string[]>([]);
  const [newlyGeneratedTaskIds, setNewlyGeneratedTaskIds] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiScopeWarning, setAiScopeWarning] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<AiPromptState | null>(null);
  const [regenBudgetMessage, setRegenBudgetMessage] = useState<string | null>(null);
  const newTaskHighlightTimeoutRef = useRef<number | null>(null);

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

  const clearNewTaskHighlights = useCallback(() => {
    if (newTaskHighlightTimeoutRef.current !== null) {
      window.clearTimeout(newTaskHighlightTimeoutRef.current);
      newTaskHighlightTimeoutRef.current = null;
    }
    setNewlyGeneratedTaskIds([]);
  }, []);

  const highlightNewTasks = useCallback(
    (taskIds: string[]) => {
      clearNewTaskHighlights();
      if (taskIds.length === 0) return;
      setNewlyGeneratedTaskIds(taskIds);
      newTaskHighlightTimeoutRef.current = window.setTimeout(() => {
        setNewlyGeneratedTaskIds([]);
        newTaskHighlightTimeoutRef.current = null;
      }, NEW_TASK_HIGHLIGHT_MS);
    },
    [clearNewTaskHighlights],
  );

  useEffect(
    () => () => {
      if (newTaskHighlightTimeoutRef.current !== null) {
        window.clearTimeout(newTaskHighlightTimeoutRef.current);
      }
    },
    [],
  );

  const runAiGeneration = useCallback(
    async (remainingBudget: number, removeTaskIds: string[], notes: string) => {
      if (!projectId) return;
      clearNewTaskHighlights();
      const state = useAppStore.getState();
      const selectedProject = state.projects.find((project) => project.id === projectId);
      if (!selectedProject) {
        setRegeneratingTaskIds([]);
        return;
      }
      if (remainingBudget <= 0) {
        setRegeneratingTaskIds([]);
        setAiError("No remaining budget for additional generated tasks.");
        return;
      }

      const selectedDate = state.ui.selectedDate || isoToday();
      setRegeneratingTaskIds(removeTaskIds);
      setIsGenerating(true);
      const generationStartedAt = Date.now();
      setAiError(null);
      setAiScopeWarning(null);
      ensurePlan();
      try {
        const projectMilestones = selectProjectMilestones(state, selectedProject.id);
        const milestoneIdByTitle = new Map(
          projectMilestones.map((milestone) => [milestone.title.trim().toLowerCase(), milestone.id]),
        );
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
              description: milestone.description,
              status: milestone.status,
            })),
            constraints: selectedProject.constraints,
            timeBudgetMinutes: remainingBudget,
            notes: notes.trim() || undefined,
          }),
        });
        const data = (await response.json()) as {
          tasks?: AiTask[];
          scopeWarning?: { filteredCount?: number };
          meta?: AiDebugMeta;
        };
        if (data.meta) {
          console.debug("[AI debug][tasks]", data.meta);
        }
        if (!response.ok || !data?.tasks) {
          throw new Error("AI response invalid");
        }
        const warnings: string[] = [];
        if (data.scopeWarning?.filteredCount) {
          const count = Number(data.scopeWarning.filteredCount) || 0;
          if (count > 0) {
            warnings.push(
              `Removed ${count} task${count === 1 ? "" : "s"} that referenced other milestones.`,
            );
          }
        }
        const now = new Date().toISOString();
        const batchIdBase = crypto.randomUUID();
        const newTasks: Task[] = (data.tasks as AiTask[]).map((task) => {
          const normalizedTaskMilestoneTitle = task.milestoneTitle?.trim().toLowerCase();
          const resolvedMilestoneId =
            selectedMilestone?.id ||
            (normalizedTaskMilestoneTitle
              ? milestoneIdByTitle.get(normalizedTaskMilestoneTitle)
              : undefined);
          return {
            id: crypto.randomUUID(),
            projectId: selectedProject.id,
            milestoneId: resolvedMilestoneId,
            title: task.title,
            description: task.description ?? undefined,
            estimateMinutes: task.estimateMinutes,
            status: "todo",
            createdAt: now,
            source: "ai",
            aiBatchId: `${batchIdBase}:${resolvedMilestoneId ?? "whole"}`,
            pinned: false,
          };
        });

        let remaining = remainingBudget;
        const cappedTasks = newTasks.filter((task) => {
          if (task.estimateMinutes > remaining) return false;
          remaining -= task.estimateMinutes;
          return true;
        });

        if (warnings.length > 0) {
          setAiScopeWarning(warnings.join(" "));
        }
        if (cappedTasks.length === 0) {
          setAiError("Generated tasks did not fit the remaining budget.");
          return;
        }

        if (removeTaskIds.length > 0) {
          state.removeTasks(removeTaskIds);
          state.detachTasksFromPlan(selectedDate, selectedProject.id, removeTaskIds);
          state.removeProgressEntriesForTasks(removeTaskIds);
        }

        state.addTasks(cappedTasks);
        state.attachTasksToPlan(
          selectedDate,
          selectedProject.id,
          cappedTasks.map((task) => task.id),
        );
        highlightNewTasks(cappedTasks.map((task) => task.id));
      } catch (error) {
        setAiError((error as Error).message);
      } finally {
        const elapsed = Date.now() - generationStartedAt;
        if (elapsed < MIN_GENERATING_VISUAL_MS) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, MIN_GENERATING_VISUAL_MS - elapsed);
          });
        }
        setIsGenerating(false);
        setRegeneratingTaskIds([]);
      }
    },
    [clearNewTaskHighlights, ensurePlan, highlightNewTasks, milestoneId, projectId],
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

      const { scopeMilestoneId, scopeTasks } = buildAiScope(planTasks);
      const pinnedTasks = scopeTasks.filter((task) => task.pinned);
      const unpinnedTasks = scopeTasks.filter((task) => !task.pinned);
      const removedEstimate = unpinnedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      const remainingReplace = computeRemainingBudget(budget, totalPlanned, removedEstimate);
      const removedEstimateAll = scopeTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      const remainingReplaceAll = computeRemainingBudget(budget, totalPlanned, removedEstimateAll);
      const remainingAppend = computeRemainingBudget(budget, totalPlanned, 0);
      const rebalanceCandidates = scopeMilestoneId
        ? planTasks.filter(
          (task) =>
            task.source === "ai" &&
            !task.pinned &&
            task.status === "todo" &&
            task.milestoneId !== scopeMilestoneId,
        )
        : [];
      const rebalanceEstimate = rebalanceCandidates.reduce(
        (sum, task) => sum + task.estimateMinutes,
        0,
      );
      const remainingRebalance = computeRemainingBudget(
        budget,
        totalPlanned,
        rebalanceEstimate,
      );
      const canRebalance =
        !!scopeMilestoneId && rebalanceCandidates.length > 0 && remainingRebalance > 0;

      const pinnedMinutes = pinnedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
      if (budget > 0 && scopeTasks.length > 0 && pinnedMinutes >= budget) {
        setRegenBudgetMessage(
          `Your pinned tasks already fill ${formatMinutes(budget)}. Free up time by removing a task or adjusting estimates.`,
        );
        return;
      }

      if (scopeTasks.length === 0) {
        if (remainingAppend <= 0) {
          if (canRebalance) {
            setAiPrompt({
              mode: "crossReplace",
              pinnedCount: 0,
              unpinnedCount: rebalanceCandidates.length,
              remainingAppend,
              remainingReplace: remainingRebalance,
              remainingReplaceAll,
              removeTaskIds: rebalanceCandidates.map((task) => task.id),
              removeAllTaskIds: rebalanceCandidates.map((task) => task.id),
            });
            return;
          }
          setAiPrompt({
            mode: "budgetFull",
            pinnedCount: 0,
            unpinnedCount: 0,
            remainingAppend,
            remainingReplace: 0,
            remainingReplaceAll: 0,
            removeTaskIds: [],
            removeAllTaskIds: [],
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
        if (!scopeMilestoneId) {
          setShouldScrollToRegenMessage?.(false);
          await runAiGeneration(remainingAppend, [], notes);
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
        return;
      }

      if (remainingReplace > 0) {
        setShouldScrollToRegenMessage?.(false);
        await runAiGeneration(remainingReplace, unpinnedTasks.map((task) => task.id), notes);
        return;
      }

      if (canRebalance) {
        setAiPrompt({
          mode: "crossReplace",
          pinnedCount: pinnedTasks.length,
          unpinnedCount: rebalanceCandidates.length,
          remainingAppend,
          remainingReplace: remainingRebalance,
          remainingReplaceAll,
          removeTaskIds: rebalanceCandidates.map((task) => task.id),
          removeAllTaskIds: rebalanceCandidates.map((task) => task.id),
        });
        return;
      }

      setAiPrompt({
        mode: "budgetFull",
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
      const data = (await response.json()) as {
        milestones?: { title: string; description?: string }[];
        meta?: AiDebugMeta;
      };
      if (data.meta) {
        console.debug("[AI debug][milestones]", data.meta);
      }
      if (!response.ok || !data?.milestones) {
        throw new Error("AI response invalid");
      }

      const generatedMilestones = data.milestones as { title: string; description?: string }[];
      generatedMilestones.forEach((milestone) => {
        state.createMilestone(
          selectedProject.id,
          milestone.title,
          milestone.description?.trim() || undefined,
        );
        state.addActivity(selectedProject.id, `Proposed milestone: ${milestone.title}`);
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
    regeneratingTaskIds,
    newlyGeneratedTaskIds,
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
