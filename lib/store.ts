import { create } from "zustand";
import type {
  AppState,
  AppView,
  DailyPlan,
  Project,
  Task,
  TaskStatus,
  Milestone,
  Activity,
  BrainstormMessage,
  BrainstormDraft,
} from "./types";

const todayIso = () => new Date().toISOString().slice(0, 10);

const defaultState: AppState = {
  projects: [],
  tasks: [],
  dailyPlans: [],
  progressEntries: [],
  milestones: [],
  activities: [],
  brainstormMessages: [],
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
  createProject: (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project;
  addTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskEstimate: (taskId: string, estimateMinutes: number) => void;
  setFocusTask: (taskId?: string) => void;
  upsertDailyPlan: (plan: DailyPlan) => void;
  attachTasksToPlan: (date: string, projectId: string, taskIds: string[]) => void;
  setLastTranscript: (value?: string) => void;
  setLastVoicePrompt: (value?: string) => void;
  createMilestone: (projectId: string, title: string) => void;
  updateMilestoneStatus: (id: string, status: "active" | "completed") => void;
  updateMilestone: (id: string, title: string) => void;
  deleteMilestone: (id: string) => void;
  moveMilestone: (id: string, direction: "up" | "down") => void;
  updateProject: (projectId: string, data: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>) => void;
  addActivity: (projectId: string, description: string) => void;
  addBrainstormMessage: (role: "user" | "assistant", content: string, options?: string[]) => void;
  updateActiveDraft: (draft: Partial<BrainstormDraft>) => void;
  clearBrainstorm: () => void;
  promoteDraftToProject: () => void;
};

export const useAppStore = create<AppState & StoreActions>((set, get) => ({
  ...defaultState,
  hydrate: (state) => set(() => state),
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
  updateProject: (projectId, data) =>
    set((state) => {
      const next = state.projects.map((p) =>
        p.id === projectId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p,
      );
      return { projects: next };
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

      const activity = task
        ? {
          id: crypto.randomUUID(),
          projectId: task.projectId,
          description: `Moved task "${task.title}" to ${status}.`,
          timestamp: new Date().toISOString(),
        }
        : undefined;

      return {
        tasks,
        progressEntries: progressEntry
          ? [...state.progressEntries, progressEntry]
          : state.progressEntries,
        activities: activity ? [activity, ...state.activities] : state.activities,
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
          timeBudgetOverrideMinutes: undefined,
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
  createMilestone: (projectId, title) =>
    set((state) => {
      const milestone: Milestone = {
        id: crypto.randomUUID(),
        projectId,
        title,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      return { milestones: [...state.milestones, milestone] };
    }),
  updateMilestoneStatus: (id, status) =>
    set((state) => {
      const next = state.milestones.map((m) =>
        m.id === id ? { ...m, status } : m,
      );
      return { milestones: next };
    }),
  updateMilestone: (id, title) =>
    set((state) => {
      const next = state.milestones.map((m) =>
        m.id === id ? { ...m, title } : m,
      );
      return { milestones: next };
    }),
  deleteMilestone: (id) =>
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    })),
  moveMilestone: (id, direction) =>
    set((state) => {
      const milestoneIndex = state.milestones.findIndex((m) => m.id === id);
      if (milestoneIndex === -1) return state;

      const milestone = state.milestones[milestoneIndex];
      const projectMilestones = state.milestones.filter(m => m.projectId === milestone.projectId);
      const indexInProject = projectMilestones.findIndex(m => m.id === id);

      if (direction === "up" && indexInProject > 0) {
        const targetId = projectMilestones[indexInProject - 1].id;
        const stateTargetIndex = state.milestones.findIndex(m => m.id === targetId);
        const next = [...state.milestones];
        [next[milestoneIndex], next[stateTargetIndex]] = [next[stateTargetIndex], next[milestoneIndex]];
        return { milestones: next };
      }

      if (direction === "down" && indexInProject < projectMilestones.length - 1) {
        const targetId = projectMilestones[indexInProject + 1].id;
        const stateTargetIndex = state.milestones.findIndex(m => m.id === targetId);
        const next = [...state.milestones];
        [next[milestoneIndex], next[stateTargetIndex]] = [next[stateTargetIndex], next[milestoneIndex]];
        return { milestones: next };
      }

      return state;
    }),
  addActivity: (projectId, description) =>
    set((state) => {
      const activity: Activity = {
        id: crypto.randomUUID(),
        projectId,
        description,
        timestamp: new Date().toISOString(),
      };
      return { activities: [activity, ...state.activities] };
    }),
  addBrainstormMessage: (role, content, options) =>
    set((state) => ({
      brainstormMessages: [
        ...state.brainstormMessages,
        { id: crypto.randomUUID(), role, content, options, timestamp: new Date().toISOString() },
      ],
    })),
  updateActiveDraft: (draft) =>
    set((state) => ({
      activeDraft: {
        ...(state.activeDraft || { name: "", goal: "", milestones: [], constraints: [], isReady: false }),
        ...draft,
      },
    })),
  clearBrainstorm: () =>
    set(() => ({
      brainstormMessages: [],
      activeDraft: undefined,
    })),
  promoteDraftToProject: () => {
    const { activeDraft, createProject, createMilestone, setView, clearBrainstorm } = get();
    if (!activeDraft) return;

    const project = createProject({
      name: activeDraft.name || "Untitled Project",
      goal: activeDraft.goal || "Brainstormed Goal",
      constraints: {
        timeBudgetMinutes: 60,
        focusNotes: activeDraft.constraints.join("\n"),
      },
    });

    activeDraft.milestones.forEach((m) => {
      createMilestone(project.id, m);
    });

    clearBrainstorm();
    setView("plan");
  },
}));

export const getInitialState = (): AppState => defaultState;
