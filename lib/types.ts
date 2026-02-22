export type TaskStatus = "todo" | "doing" | "done";
export type TaskSource = "manual" | "ai";

export type ProjectPhase =
  | "discovery"
  | "planning"
  | "build"
  | "QA"
  | "launch"
  | "maintenance";

export type ProjectMilestone = {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string;
};

export type ProjectStatus = {
  phase: ProjectPhase;
  note?: string;
  milestones: ProjectMilestone[];
  updatedAt: string;
};

export type ProjectConstraints = {
  timeBudgetMinutes: number;
  focusNotes?: string;
};

export type Project = {
  id: string;
  name: string;
  goal: string;
  constraints: ProjectConstraints;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  estimateMinutes: number;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  source: TaskSource;
};

export type DailyPlan = {
  id: string;
  projectId: string;
  date: string;
  taskIds: string[];
  timeBudgetMinutes: number;
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

export type AppView = "projects" | "plan" | "focus" | "history";

export type AppState = {
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
  progressEntries: ProgressEntry[];
  ui: {
    selectedProjectId?: string;
    selectedDate: string;
    activeView: AppView;
    focusTaskId?: string;
    lastTranscript?: string;
    lastVoicePrompt?: string;
  };
};
