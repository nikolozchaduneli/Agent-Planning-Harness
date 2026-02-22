import { create } from "zustand";
import type {
  AppState,
  AppView,
  DailyPlan,
  Project,
  ProjectMilestone,
  ProjectPhase,
  ProjectStatus,
  Task,
  TaskStatus,
} from "./types";

const todayIso = () => new Date().toISOString().slice(0, 10);

const defaultState: AppState = {
  projects: [],
  tasks: [],
  dailyPlans: [],
  progressEntries: [],
  ui: {
    selectedDate: todayIso(),
    activeView: "projects",
  },
};

type StoreActions = {
  hydrate: (state: AppState) => void;
  setView: (view: AppView) => void;
  setDate: (date: string) => void;
  setSelectedProject: (projectId?: string) => void;
  upsertProject: (project: Project) => void;
  createProject: (data: Omit<Project, "id" | "createdAt" | "updatedAt" | "status">) => Project;
  updateProjectStatus: (
    projectId: string,
    updates: Partial<Pick<ProjectStatus, "phase" | "note">>,
  ) => void;
  addProjectMilestone: (projectId: string, title: string) => void;
  updateProjectMilestone: (
    projectId: string,
    milestoneId: string,
    updates: Partial<Pick<ProjectMilestone, "title" | "done">>,
  ) => void;
  removeProjectMilestone: (projectId: string, milestoneId: string) => void;
  addTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskEstimate: (taskId: string, estimateMinutes: number) => void;
  setFocusTask: (taskId?: string) => void;
  upsertDailyPlan: (plan: DailyPlan) => void;
  attachTasksToPlan: (date: string, projectId: string, taskIds: string[]) => void;
  setLastTranscript: (value?: string) => void;
  setLastVoicePrompt: (value?: string) => void;
};

const defaultProjectStatus = (fallbackTimestamp?: string): ProjectStatus => ({
  phase: "planning",
  note: "",
  milestones: [],
  updatedAt: fallbackTimestamp ?? new Date().toISOString(),
});

const normalizeState = (state: AppState): AppState => {
  const projects = state.projects.map((project) => {
    if (project.status) {
      const normalizedStatus: ProjectStatus = {
        phase: project.status.phase || "planning",
        note: project.status.note || "",
        milestones: project.status.milestones || [],
        updatedAt: project.status.updatedAt || project.updatedAt || new Date().toISOString(),
      };
      return { ...project, status: normalizedStatus };
    }
    return {
      ...project,
      status: defaultProjectStatus(project.updatedAt),
    };
  });
  return { ...state, projects };
};

export const useAppStore = create<AppState & StoreActions>((set) => ({
  ...defaultState,
  hydrate: (state) => set(() => normalizeState(state)),
  setView: (view) => set((state) => ({ ui: { ...state.ui, activeView: view } })),
  setDate: (date) =>
    set((state) => ({ ui: { ...state.ui, selectedDate: date } })),
  setSelectedProject: (projectId) =>
    set((state) => ({
      ui: { ...state.ui, selectedProjectId: projectId },
    })),
  createProject: (data) => {
    const now = new Date().toISOString();
    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      status: defaultProjectStatus(now),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      projects: [...state.projects, project],
      ui: { ...state.ui, selectedProjectId: project.id, activeView: "plan" },
    }));
    return project;
  },
  upsertProject: (project) =>
    set((state) => {
      const index = state.projects.findIndex((item) => item.id === project.id);
      if (index === -1) {
        return { projects: [...state.projects, project] };
      }
      const next = [...state.projects];
      next[index] = project;
      return { projects: next };
    }),
  updateProjectStatus: (projectId, updates) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextProjects = state.projects.map((project) => {
        if (project.id !== projectId) return project;
        const status = project.status ?? defaultProjectStatus(project.updatedAt);
        return {
          ...project,
          status: {
            ...status,
            ...updates,
            note: typeof updates.note === "string" ? updates.note : status.note,
            updatedAt: now,
          },
          updatedAt: now,
        };
      });
      return { projects: nextProjects };
    }),
  addProjectMilestone: (projectId, title) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextProjects = state.projects.map((project) => {
        if (project.id !== projectId) return project;
        const status = project.status ?? defaultProjectStatus(project.updatedAt);
        const milestone: ProjectMilestone = {
          id: crypto.randomUUID(),
          title,
          done: false,
        };
        return {
          ...project,
          status: {
            ...status,
            milestones: [...status.milestones, milestone],
            updatedAt: now,
          },
          updatedAt: now,
        };
      });
      return { projects: nextProjects };
    }),
  updateProjectMilestone: (projectId, milestoneId, updates) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextProjects = state.projects.map((project) => {
        if (project.id !== projectId) return project;
        const status = project.status ?? defaultProjectStatus(project.updatedAt);
        const milestones = status.milestones.map((milestone) => {
          if (milestone.id !== milestoneId) return milestone;
          const nextDone = updates.done ?? milestone.done;
          return {
            ...milestone,
            ...updates,
            done: nextDone,
            completedAt: nextDone ? milestone.completedAt ?? now : undefined,
          };
        });
        return {
          ...project,
          status: {
            ...status,
            milestones,
            updatedAt: now,
          },
          updatedAt: now,
        };
      });
      return { projects: nextProjects };
    }),
  removeProjectMilestone: (projectId, milestoneId) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextProjects = state.projects.map((project) => {
        if (project.id !== projectId) return project;
        const status = project.status ?? defaultProjectStatus(project.updatedAt);
        return {
          ...project,
          status: {
            ...status,
            milestones: status.milestones.filter((milestone) => milestone.id !== milestoneId),
            updatedAt: now,
          },
          updatedAt: now,
        };
      });
      return { projects: nextProjects };
    }),
  addTasks: (tasks) =>
    set((state) => ({
      tasks: [...state.tasks, ...tasks],
    })),
  updateTaskStatus: (taskId, status) =>
    set((state) => {
      const tasks = state.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        const completedAt = status === "done" ? new Date().toISOString() : undefined;
        return { ...task, status, completedAt };
      });
      const task = tasks.find((item) => item.id === taskId);
      const date = state.ui.selectedDate;
      const progressEntry = task
        ? {
            id: crypto.randomUUID(),
            date,
            projectId: task.projectId,
            taskId,
            status,
          }
        : undefined;
      return {
        tasks,
        progressEntries: progressEntry
          ? [...state.progressEntries, progressEntry]
          : state.progressEntries,
      };
    }),
  updateTaskEstimate: (taskId, estimateMinutes) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, estimateMinutes } : task,
      ),
    })),
  setFocusTask: (taskId) =>
    set((state) => ({ ui: { ...state.ui, focusTaskId: taskId } })),
  upsertDailyPlan: (plan) =>
    set((state) => {
      const index = state.dailyPlans.findIndex((item) => item.id === plan.id);
      if (index === -1) {
        return { dailyPlans: [...state.dailyPlans, plan] };
      }
      const next = [...state.dailyPlans];
      next[index] = plan;
      return { dailyPlans: next };
    }),
  attachTasksToPlan: (date, projectId, taskIds) =>
    set((state) => {
      const existing = state.dailyPlans.find(
        (plan) => plan.date === date && plan.projectId === projectId,
      );
      if (!existing) {
        const plan: DailyPlan = {
          id: crypto.randomUUID(),
          date,
          projectId,
          taskIds,
          timeBudgetMinutes: 0,
          createdAt: new Date().toISOString(),
        };
        return { dailyPlans: [...state.dailyPlans, plan] };
      }
      const nextPlans = state.dailyPlans.map((plan) =>
        plan.id === existing.id
          ? { ...plan, taskIds: Array.from(new Set([...plan.taskIds, ...taskIds])) }
          : plan,
      );
      return { dailyPlans: nextPlans };
    }),
  setLastTranscript: (value) =>
    set((state) => ({ ui: { ...state.ui, lastTranscript: value } })),
  setLastVoicePrompt: (value) =>
    set((state) => ({ ui: { ...state.ui, lastVoicePrompt: value } })),
}));

export const getInitialState = (): AppState => defaultState;
