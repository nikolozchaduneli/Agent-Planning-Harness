import type { AppState, Task } from "./types";

export const selectActivePlan = (
  state: AppState,
  projectId?: string,
  date?: string,
) => {
  if (!projectId || !date) return undefined;
  return state.dailyPlans.find(
    (plan) => plan.projectId === projectId && plan.date === date,
  );
};

export const selectPlanTasks = (state: AppState, planTaskIds: string[]) => {
  if (!planTaskIds.length) return [];
  const idSet = new Set(planTaskIds);
  return state.tasks.filter((task) => idSet.has(task.id));
};

export const selectProjectMilestones = (state: AppState, projectId?: string) => {
  if (!projectId) return [];
  return state.milestones.filter((milestone) => milestone.projectId === projectId);
};

export const selectScopedActivities = (
  state: AppState,
  projectId: string | undefined,
  date: string,
  showAll: boolean,
) => {
  if (!projectId) return [];
  const projectActivities = state.activities.filter((a) => a.projectId === projectId);
  if (showAll) return projectActivities;
  return projectActivities.filter((a) => a.timestamp.slice(0, 10) === date);
};

export const selectPerProjectStats = (state: AppState) =>
  state.projects.map((project) => {
    const completed = state.tasks.filter(
      (task) => task.projectId === project.id && task.status === "done",
    ).length;
    const total = state.tasks.filter((task) => task.projectId === project.id).length;
    return { project, completed, total };
  });

export const buildProjectHistory = (
  tasks: AppState["tasks"],
  projectId: string | undefined,
  lookbackDays: number,
  baseDateIso: string,
) => {
  const base = new Date(baseDateIso);
  const days = Array.from({ length: lookbackDays }).map((_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() - (lookbackDays - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  return days.map((day) => ({
    date: day,
    total: tasks.filter(
      (task) => task.completedAt?.startsWith(day) && task.projectId === projectId,
    ).length,
  }));
};

export const selectAiBatchMeta = (
  planTasks: Task[],
  milestoneTitleMap: Map<string, string>,
) => {
  const map = new Map<string, { label: string; createdAt: string }>();
  planTasks.forEach((task) => {
    if (task.source !== "ai") return;
    const batchKey = task.aiBatchId ?? `legacy-${task.milestoneId ?? "whole"}`;
    if (map.has(batchKey)) return;
    const label = task.milestoneId
      ? milestoneTitleMap.get(task.milestoneId) || "Milestone"
      : "Whole Project";
    map.set(batchKey, { label, createdAt: task.createdAt });
  });
  return map;
};
