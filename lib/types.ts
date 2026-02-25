export type TaskStatus = "todo" | "doing" | "done";
export type TaskSource = "manual" | "ai";

export type ProjectConstraints = {
  timeBudgetMinutes: number;
  focusNotes?: string;
};

export type Project = {
  id: string;
  name: string;
  goal: string;
  constraints: ProjectConstraints;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  estimateMinutes: number;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  source: TaskSource;
  aiBatchId?: string;
  pinned?: boolean;
};

export type DailyPlan = {
  id: string;
  projectId: string;
  date: string;
  taskIds: string[];
  timeBudgetOverrideMinutes?: number;
  createdAt: string;
};

export type ProgressEntry = {
  id: string;
  date: string;
  projectId: string;
  taskId: string;
  status: TaskStatus;
  durationMinutes?: number;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  status: "active" | "completed";
  createdAt: string;
};

export type Activity = {
  id: string;
  projectId: string;
  timestamp: string;
  description: string;
};

export type BrainstormMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  options?: string[];
  timestamp: string;
};

export type BrainstormDraft = {
  name: string;
  goal: string;
  milestones: string[];
  constraints: string[];
  isReady: boolean;
};

export type AppView = "projects" | "plan" | "focus" | "history" | "brainstorm";

export type AppState = {
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
  progressEntries: ProgressEntry[];
  milestones: Milestone[];
  activities: Activity[];
  brainstormMessages: BrainstormMessage[];
  activeDraft?: BrainstormDraft;
  ui: {
    selectedProjectId?: string;
    selectedDate: string;
    activeView: AppView;
    focusTaskId?: string;
    planMilestoneByProject?: Record<string, string>;
    lastTranscript?: string;
    lastVoicePrompt?: string;
  };
};
