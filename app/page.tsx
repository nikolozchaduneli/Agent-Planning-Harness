"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "@/lib/storage";
import { getInitialState, useAppStore } from "@/lib/store";
import type { AppState, DailyPlan, Task } from "@/lib/types";

type AiTask = {
  title: string;
  description?: string;
  estimateMinutes: number;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

const formatMinutes = (value: number) =>
  value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}m` : `${value}m`;

const DictationMic = ({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={`flex items-center justify-center rounded-full p-2 transition opacity-60 hover:opacity-100 ${isRecording ? "bg-red-100 text-red-600 animate-pulse opacity-100" : "bg-transparent text-[var(--ink)]"
      }`}
    title={isRecording ? "Stop dictation" : "Start dictation"}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  </button>
);

export default function Home() {
  const {
    projects,
    tasks,
    dailyPlans,
    progressEntries,
    milestones,
    activities,
    ui,
    hydrate,
    setView,
    setDate,
    setSelectedProject,
    createProject,
    upsertDailyPlan,
    addTasks,
    attachTasksToPlan,
    updateTaskStatus,
    updateTaskEstimate,
    setFocusTask,
    setLastTranscript,
    setLastVoicePrompt,
    createMilestone,
    updateMilestoneStatus,
    updateMilestone,
    deleteMilestone,
    moveMilestone,
    updateProject,
    addActivity,
    brainstormMessages,
    activeDraft,
    addBrainstormMessage,
    updateActiveDraft,
    clearBrainstorm,
    promoteDraftToProject,
  } = useAppStore();

  const [projectName, setProjectName] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectBudget, setProjectBudget] = useState(240);
  const [projectFocus, setProjectFocus] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; goal?: string }>({});
  const [planNotes, setPlanNotes] = useState("");
  const [notesFromVoice, setNotesFromVoice] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualEstimate, setManualEstimate] = useState(25);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [showMilestonePrompt, setShowMilestonePrompt] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [activeRecordingField, setActiveRecordingField] = useState<string | null>(null);
  const activeRecordingCallback = useRef<((transcript: string) => void) | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [brainstormInput, setBrainstormInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [showBudgetOverride, setShowBudgetOverride] = useState(false);
  const [budgetOverrideDraft, setBudgetOverrideDraft] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const newMilestoneInputRef = useRef<HTMLInputElement | null>(null);

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const selectedDate = ui.selectedDate || isoToday();

  const isFirstRun = projects.length === 0;

  const activePlan = useMemo(() => {
    if (!selectedProject) return undefined;
    return dailyPlans.find(
      (plan) => plan.projectId === selectedProject.id && plan.date === selectedDate,
    );
  }, [dailyPlans, selectedDate, selectedProject]);

  const planTaskIds = activePlan?.taskIds ?? [];
  const planTasks = tasks.filter((task) => planTaskIds.includes(task.id));
  const totalPlanned = planTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const budget = activePlan?.timeBudgetOverrideMinutes ?? selectedProject?.constraints.timeBudgetMinutes ?? 0;
  const projectMilestones = milestones.filter((m) => m.projectId === selectedProject?.id);
  const selectedMilestone = selectedMilestoneId
    ? projectMilestones.find((m) => m.id === selectedMilestoneId)
    : undefined;
  const hasBudgetOverride = typeof activePlan?.timeBudgetOverrideMinutes === "number";

useEffect(() => {
  const init = async () => {
    const stored = await loadState();
    if (stored) {
      hydrate(stored);
      return;
    }
    hydrate(getInitialState());
  };
  init();
}, [hydrate]);

useEffect(() => {
  if (ui.activeView === "brainstorm" && brainstormMessages.length > 0) {
    document.getElementById("anchor")?.scrollIntoView({ behavior: "smooth" });
  }
}, [brainstormMessages, ui.activeView]);

useEffect(() => {
  if (projectMilestones.length > 0) {
    setShowMilestonePrompt(false);
  }
}, [projectMilestones.length, selectedProject?.id]);

useEffect(() => {
  if (!showBudgetOverride && !hasBudgetOverride) return;
  const existing = activePlan?.timeBudgetOverrideMinutes;
  setBudgetOverrideDraft(typeof existing === "number" ? String(existing) : "");
}, [showBudgetOverride, hasBudgetOverride, activePlan?.timeBudgetOverrideMinutes]);

useEffect(() => {
  if (isFirstRun) return;
  if (ui.activeView === "brainstorm") {
    setIsLeftSidebarOpen(false);
  }
}, [ui.activeView, isFirstRun]);

useEffect(() => {
  const unsub = useAppStore.subscribe((state: AppState) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveState(state);
    }, 300);
  });
  return () => unsub();
}, []);

  const handleCreateProject = () => {
    const errors: { name?: string; goal?: string } = {};
    if (!projectName.trim()) errors.name = "Project name is required";
    if (!projectGoal.trim()) errors.goal = "Project goal is required";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const clampedBudget = Math.max(15, Math.min(720, projectBudget || 240));
    const project = createProject({
      name: projectName.trim(),
      goal: projectGoal.trim(),
      constraints: {
        timeBudgetMinutes: clampedBudget,
        focusNotes: projectFocus.trim() || undefined,
      },
    });
    setSelectedProject(project.id);
    setView("plan");
    setProjectName("");
    setProjectGoal("");
    setProjectFocus("");
  };

const handleBrainstorm = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (!brainstormInput.trim() || isBrainstorming) return;

  const content = brainstormInput.trim();
  setBrainstormInput("");
  addBrainstormMessage("user", content);
  setIsBrainstorming(true);

  try {
    const response = await fetch("/api/ai/brainstorm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...brainstormMessages, { role: "user", content }],
        currentDraft: activeDraft
      })
    });

    if (!response.ok) throw new Error("API error");

    const data = await response.json();
    addBrainstormMessage("assistant", data.message, data.options);
    if (data.updatedDraft) {
      updateActiveDraft(data.updatedDraft);
    }
  } catch (err) {
    console.error("Brainstorm error", err);
    addBrainstormMessage("assistant", "I hit a snag in my thinking process. Could you say that again?");
  } finally {
    setIsBrainstorming(false);
  }
};

const ensurePlan = () => {
  if (!selectedProject) return;
  if (activePlan) return;
  const plan: DailyPlan = {
    id: crypto.randomUUID(),
    projectId: selectedProject.id,
    date: selectedDate,
    taskIds: [],
    timeBudgetOverrideMinutes: undefined,
    createdAt: new Date().toISOString(),
  };
  upsertDailyPlan(plan);
};

const handleAddManualTask = () => {
  if (!selectedProject || !manualTitle.trim()) return;
  ensurePlan();
  const task: Task = {
    id: crypto.randomUUID(),
    projectId: selectedProject.id,
    title: manualTitle.trim(),
    estimateMinutes: manualEstimate,
    status: "todo",
    createdAt: new Date().toISOString(),
    source: "manual",
  };
  addTasks([task]);
  attachTasksToPlan(selectedDate, selectedProject.id, [task.id]);
  setManualTitle("");
};

  const handleGenerateTasks = async (skipMilestonePrompt?: boolean) => {
  if (!selectedProject) return;
  if (!skipMilestonePrompt && projectMilestones.length === 0) {
    setShowMilestonePrompt(true);
    return;
  }
  setIsGenerating(true);
  setAiError(null);
  ensurePlan();
  try {
    const response = await fetch("/api/ai/generate-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProject.id,
        goal: selectedProject.goal,
        projectName: selectedProject.name,
        milestoneTitle: selectedMilestone ? selectedMilestone.title : undefined,
        constraints: selectedProject.constraints,
        timeBudgetMinutes: budget || selectedProject.constraints.timeBudgetMinutes,
        notes: planNotes.trim() || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.tasks) {
      throw new Error("AI response invalid");
    }
    const now = new Date().toISOString();
    const newTasks: Task[] = (data.tasks as AiTask[]).map((task) => ({
      id: crypto.randomUUID(),
      projectId: selectedProject.id,
      title: task.title,
      description: task.description,
      estimateMinutes: task.estimateMinutes,
      status: "todo",
      createdAt: now,
      source: "ai",
    }));
    addTasks(newTasks);
    attachTasksToPlan(
      selectedDate,
      selectedProject.id,
      newTasks.map((task) => task.id),
    );
  } catch (error) {
    setAiError((error as Error).message);
  } finally {
    setIsGenerating(false);
  }
};

const handleProposeMilestones = async () => {
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
    generatedMilestones.forEach(m => {
      createMilestone(selectedProject.id, m.title);
      addActivity(selectedProject.id, `AI Proposed milestone: ${m.title}`);
    });
  } catch (error) {
    console.error("Failed to generate milestones", error);
  } finally {
    setIsGeneratingMilestones(false);
  }
};

const handlePlanBudgetOverrideChange = (value: number) => {
  if (!selectedProject) return;
  ensurePlan();
  const clamped = Math.max(30, Math.min(720, value || 0));
  const plan: DailyPlan = activePlan
    ? { ...activePlan, timeBudgetOverrideMinutes: clamped }
    : {
      id: crypto.randomUUID(),
      projectId: selectedProject.id,
      date: selectedDate,
      taskIds: [],
      timeBudgetOverrideMinutes: clamped,
      createdAt: new Date().toISOString(),
    };
  upsertDailyPlan(plan);
};

const clearPlanBudgetOverride = () => {
  if (!selectedProject || !activePlan) return;
  upsertDailyPlan({ ...activePlan, timeBudgetOverrideMinutes: undefined });
};

const focusTask =
  tasks.find((task) => task.id === ui.focusTaskId) ||
  planTasks.find((task) => task.status !== "done");

const projectHistory = useMemo(() => {
  const lookbackDays = 10;
  const days = Array.from({ length: lookbackDays }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (lookbackDays - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  return days.map((day) => ({
    date: day,
    total: tasks.filter(
      (task) => task.completedAt?.startsWith(day) && task.projectId === selectedProject?.id,
    ).length,
  }));
}, [tasks, selectedProject]);

const perProjectStats = projects.map((project) => {
  const completed = tasks.filter(
    (task) => task.projectId === project.id && task.status === "done",
  ).length;
  const total = tasks.filter((task) => task.projectId === project.id).length;
  return { project, completed, total };
});

const buildTranscriptionPrompt = () => {
  if (!selectedProject) {
    return "";
  }
  const name = selectedProject.name.trim();
  const goal = selectedProject.goal.trim();
  const goalSnippet = goal.length > 400 ? `${goal.slice(0, 400)}...` : goal;
  return `Context: The project is "${name}". It is spelled exactly as shown.
Goal: ${goalSnippet || "none"}.
Prefer exact capitalization for product names and acronyms.`;
};

const uploadAudio = async (blob: Blob, promptContext?: string) => {
  const form = new FormData();
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("file", blob, "recording.webm");
  const prompt = promptContext || buildTranscriptionPrompt();
  if (prompt) {
    form.append("prompt", prompt);
    setLastVoicePrompt(prompt);
  }
  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Voice transcription failed.");
  }
  const transcript = data?.transcript ?? "No transcript";
  setLastTranscript(transcript);
  return transcript;
};

const startRecording = async (fieldId: string, onTranscript: (text: string) => void, promptContext?: string) => {
  if (activeRecordingField) stopRecording();
  setVoiceError(null);
  if (!navigator.mediaDevices?.getUserMedia) {
    setVoiceError("Microphone not supported in this browser.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    setActiveRecordingField(fieldId);
    activeRecordingCallback.current = onTranscript;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      stream.getTracks().forEach((track) => track.stop());
      setVoiceLoading(true);
      try {
        const transcript = await uploadAudio(audioBlob, promptContext);
        if (activeRecordingCallback.current) {
          activeRecordingCallback.current(transcript);
        }
      } catch (error) {
        setVoiceError((error as Error).message);
      } finally {
        setVoiceLoading(false);
        setActiveRecordingField(null);
        activeRecordingCallback.current = null;
      }
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
  } catch {
    setVoiceError("Microphone permission denied.");
  }
};

const stopRecording = () => {
  const recorder = mediaRecorderRef.current;
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
};

const handleVoiceCapture = async () => {
  if (activeRecordingField === "global") {
    stopRecording();
    return;
  }
  const globalPrompt = buildTranscriptionPrompt();
  await startRecording("global", (text) => {
    setNotesFromVoice(text);
  }, globalPrompt);
};

const applyVoiceToNotes = () => {
  if (!notesFromVoice) return;
  if (ui.activeView !== "plan") {
    setView("plan");
  }
  setPlanNotes((prev) => (prev ? `${prev}\n${notesFromVoice}` : notesFromVoice));
  setNotesFromVoice(null);
};

return (
  <div className="relative flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-[15px]">
    {/* LEFT SIDEBAR: Context & Milestones */}
    {!isFirstRun && (
      <div
        className={`relative flex-shrink-0 overflow-hidden transition-all duration-600 ease-out ${isLeftSidebarOpen ? "w-[320px]" : "w-12"
          }`}
      >
        <button
          onClick={() => setIsLeftSidebarOpen((prev) => !prev)}
          className={`absolute top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(15,23,42,0.12)] bg-white text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5 ${isLeftSidebarOpen ? "right-2" : "left-1/2 -translate-x-[32%]"
            }`}
          title={isLeftSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-label={isLeftSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
        <aside
          className={`no-scrollbar flex h-full w-full flex-col gap-6 overflow-hidden bg-white/60 shadow-sm transition-all duration-600 ease-out ${isLeftSidebarOpen
            ? "translate-x-0 border-r border-[rgba(15,23,42,0.08)] p-6 opacity-100"
            : "-translate-x-4 border-r-0 p-0 opacity-0 pointer-events-none"
            }`}
        >
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h1 className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--muted)]">
                Planner
              </h1>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Active Project
              </label>
              <select
                className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                value={ui.selectedProjectId || ""}
                onChange={(event) =>
                  setSelectedProject(event.target.value ? event.target.value : undefined)
                }
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProject ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-medium leading-tight">{selectedProject.name}</h2>
                  <button
                    onClick={() => setView("projects")}
                    className="flex shrink-0 items-center justify-center rounded-full bg-[rgba(15,23,42,0.04)] p-1.5 text-[var(--muted)] transition hover:bg-[rgba(15,23,42,0.08)] hover:text-[var(--ink)]"
                    title="Edit Project Settings"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-[var(--muted)]">{selectedProject.goal}</p>

                {/* Project Status */}
                <div className="mt-2 rounded-xl border border-[rgba(15,23,42,0.05)] bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Progress</p>
                  {(() => {
                    const projectTasks = tasks.filter((t) => t.projectId === selectedProject.id && dailyPlans.some(p => p.projectId === selectedProject.id && p.taskIds.includes(t.id)));
                    const doneTasks = projectTasks.filter((t) => t.status === "done");
                    const pct = projectTasks.length ? Math.min(100, (doneTasks.length / projectTasks.length) * 100) : 0;
                    return (
                      <>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(15,23,42,0.08)]">
                          <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--muted)]">
                          {doneTasks.length} of {projectTasks.length} tasks done
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Milestones</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleProposeMilestones}
                      disabled={isGeneratingMilestones}
                      className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--accent)] hover:opacity-80 transition disabled:opacity-50"
                    >
                      {isGeneratingMilestones ? "Thinking..." : "AI Propose"}
                    </button>
                    <button
                      type="button"
                      title="Generates milestones from the project description and goal."
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(15,23,42,0.18)] text-[10px] font-bold text-[var(--muted)] transition hover:border-[rgba(15,23,42,0.35)] hover:text-[var(--ink)]"
                    >
                      ?
                    </button>
                  </div>
                </div>
                <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-6 -mr-6">
                  {milestones.filter((m) => m.projectId === selectedProject.id).map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm transition ${m.status === "completed"
                        ? "border-[rgba(15,23,42,0.05)] bg-white/50 opacity-60"
                        : m.id === selectedMilestoneId
                          ? "border-[var(--accent)]/60 bg-[rgba(249,115,22,0.08)] shadow-sm"
                          : "border-[rgba(15,23,42,0.05)] bg-white shadow-sm"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={m.status === "completed"}
                        onChange={(e) => updateMilestoneStatus(m.id, e.target.checked ? "completed" : "active")}
                        className="mt-0.5 rounded border-gray-300 text-[var(--accent)]"
                      />
                      <span className={m.status === "completed" ? "line-through" : ""}>{m.title}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      placeholder="New milestone..."
                      ref={newMilestoneInputRef}
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newMilestoneTitle.trim()) {
                          createMilestone(selectedProject.id, newMilestoneTitle.trim());
                          addActivity(selectedProject.id, `Created milestone: ${newMilestoneTitle.trim()}`);
                          setNewMilestoneTitle("");
                        }
                      }}
                      className="w-full rounded-lg border-transparent bg-white px-3 py-2 pr-10 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <div className="absolute right-1">
                      <DictationMic
                        isRecording={activeRecordingField === "newMilestone"}
                        onClick={() => {
                          if (activeRecordingField === "newMilestone") stopRecording();
                          else startRecording("newMilestone", (text) => setNewMilestoneTitle(text), "Context: I am adding a new milestone to the project.");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm italic text-[var(--muted)]">Select a project to view context.</div>
          )}
        </aside>
      </div>
    )}

    {/* CENTER PANE: Main Application */}
    <main
      className={`no-scrollbar flex flex-1 flex-col ${ui.activeView === "brainstorm" ? "overflow-hidden" : "overflow-y-auto"
        }`}
    >
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.08)] bg-[#f8fafc]/90 px-8 py-4 backdrop-blur-md">
        {isFirstRun ? (
          <div className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--muted)]">
            Welcome to Task Centric Planner
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex gap-2">
              {(["brainstorm", "plan", "focus", "history", "projects"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setView(view)}
                  className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all hover:-translate-y-0.5 ${ui.activeView === view
                    ? "bg-[var(--accent)] text-white shadow shadow-[var(--accent)]/30"
                    : "bg-transparent text-[var(--muted)] hover:bg-[rgba(15,23,42,0.04)] hover:text-[var(--ink)]"
                    }`}
                >
                  {view === "brainstorm" ? "drawing board" : view === "projects" ? "settings" : view}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {!isFirstRun && (
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          )}
          {/* Audio Recording -- only show when a project is active and NOT in brainstorm mode */}
          {!isFirstRun && selectedProject && ui.activeView !== "brainstorm" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleVoiceCapture}
                  className={`relative flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] shadow-sm transition hover:-translate-y-0.5 ${activeRecordingField === "global"
                    ? "animate-pulse border-red-500 bg-red-50 text-red-600"
                    : "border-[rgba(15,23,42,0.12)] bg-white text-[var(--ink)]"
                    }`}
                >
                  {activeRecordingField === "global" && <span className="h-2 w-2 rounded-full bg-red-600" />}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  {voiceLoading && activeRecordingField === "global" ? "Transcribing..." : activeRecordingField === "global" ? "Stop Recording" : "Record"}
                </button>
                {notesFromVoice && (
                  <button
                    onClick={applyVoiceToNotes}
                    className="rounded-full bg-[var(--accent)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow transition hover:-translate-y-0.5"
                    title="Appends the recorded transcript to your daily plan notes"
                  >
                    Add to plan notes
                  </button>
                )}
              </div>
              {voiceError && (
                <p className="text-xs text-red-600">{voiceError}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <div
        className={`mx-auto w-full px-8 ${ui.activeView === "brainstorm" ? "py-6" : "py-10 pb-20"
          } ${ui.activeView === "brainstorm" ? "max-w-none" : "max-w-5xl"}`}
      >
        <div
          key={ui.activeView}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out"
        >

          {ui.activeView === "brainstorm" && (
            <section className="grid gap-8 md:grid-cols-[1fr_360px] h-[calc(100vh-118px)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col rounded-[32px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur-md border border-white/50 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 no-scrollbar scroll-smooth">
                  {brainstormMessages.length === 0 && (
                    <div className="text-center py-20 px-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center mb-6 shadow-lg shadow-[var(--accent)]/30">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          <path d="M5 3v4" /><path d="M3 5h4" /><path d="M21 17v4" /><path d="M19 19h4" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-semibold mb-3 tracking-tight">Project Drawing Board</h2>
                      <p className="text-[var(--muted)] text-lg max-w-sm mx-auto leading-relaxed">
                        Pitch me an idea. I'll help you architect the scope, milestones, and constraints before we build.
                      </p>
                    </div>
                  )}
                  {brainstormMessages.map((msg) => (
                    <div key={msg.id} className={`max-w-[85%] rounded-[24px] p-5 text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === "user"
                      ? "self-end bg-[var(--accent)] text-white shadow-[var(--accent)]/20"
                      : "self-start bg-white text-[var(--ink)] border border-[rgba(15,23,42,0.06)]"
                      }`}>
                      {msg.content}
                    </div>
                  ))}
                  {isBrainstorming && (
                    <div className="self-start bg-white border border-[rgba(15,23,42,0.06)] text-[var(--muted)] rounded-[24px] p-5 text-sm animate-pulse flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      Architecting project structure...
                    </div>
                  )}
                  <div id="anchor" />
                </div>
                <form
                  id="brainstorm-form"
                  onSubmit={handleBrainstorm}
                  className="mt-6 flex flex-col gap-3"
                >
                  {/* Suggestion Options */}
                  {!isBrainstorming && brainstormMessages.length > 0 && brainstormMessages[brainstormMessages.length - 1].role === "assistant" && brainstormMessages[brainstormMessages.length - 1].options && (
                    <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {brainstormMessages[brainstormMessages.length - 1].options?.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setBrainstormInput(opt);
                            setTimeout(() => {
                              const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                              (document.querySelector("#brainstorm-form") as HTMLFormElement)?.dispatchEvent(submitEvent);
                            }, 10);
                          }}
                          className={`group relative flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-2xl border transition-all shadow-sm ${i === 0
                            ? "bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                            : "bg-white border-[rgba(15,23,42,0.1)] text-[var(--ink)] hover:border-[var(--ink)]"
                            }`}
                        >
                          {i === 0 && (
                            <span className="flex items-center gap-1 bg-[var(--accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                              Recommended
                            </span>
                          )}
                          {opt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("brainstorm-input")?.focus();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-2xl bg-white border border-[rgba(15,23,42,0.1)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-all italic"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Manual Input...
                      </button>
                    </div>
                  )}

                  <div className="relative group">
                    <input
                      id="brainstorm-input"
                      value={brainstormInput}
                      onChange={(e) => setBrainstormInput(e.target.value)}
                      placeholder="e.g. A cross-platform mobile app for tracking family recipes..."
                      className="w-full rounded-2xl border-transparent bg-[var(--panel)] pl-5 pr-12 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all group-hover:shadow-[0_0_0_1px_rgba(15,23,42,0.2)]"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <DictationMic
                        isRecording={activeRecordingField === "brainstorm"}
                        onClick={() => {
                          if (activeRecordingField === "brainstorm") stopRecording();
                          else startRecording("brainstorm", (text) => setBrainstormInput(text), "Context: I am brainstorming a new project idea.");
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">Press enter to send</p>
                    <button
                      type="submit"
                      disabled={!brainstormInput.trim() || isBrainstorming}
                      className="rounded-full bg-[var(--accent)] px-6 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-[var(--accent)]/30 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      Send Idea
                    </button>
                  </div>
                </form>
              </div>

              {/* Canvas Side */}
              <div className="flex flex-col gap-6 pr-6 overflow-y-auto no-scrollbar">
                <div className="rounded-[32px] bg-white/40 border border-white/60 p-6 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(15,23,42,0.1)]">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)] mb-6">Live Canvas</h3>
                  {activeDraft ? (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">Project Name</label>
                        <p className="text-lg font-semibold tracking-tight">{activeDraft.name || "Drafting name..."}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">Core Goal</label>
                        <p className="text-sm leading-relaxed text-[var(--ink)]/80 italic">"{activeDraft.goal || "Sketching the mission..."}"</p>
                      </div>

                      {activeDraft.milestones.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">Proposed Milestones</label>
                          <div className="flex flex-col gap-2">
                            {activeDraft.milestones.map((m, i) => (
                              <div key={i} className="flex gap-3 items-start text-xs bg-white/80 p-3 rounded-[16px] border border-white/60 shadow-sm transition-all hover:translate-x-1">
                                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold">{i + 1}</span>
                                {m}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeDraft.constraints.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">Constraints</label>
                          <div className="flex flex-wrap gap-1.5">
                            {activeDraft.constraints.map((c, i) => (
                              <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-500 py-1 px-2.5 rounded-full border border-slate-200">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={promoteDraftToProject}
                        disabled={!activeDraft.isReady}
                        className={`mt-6 w-full rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.3em] shadow-xl transition-all group flex items-center justify-center gap-3 ${activeDraft.isReady
                          ? "bg-[var(--ink)] text-white hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                      >
                        {activeDraft.isReady ? "Initialize Project" : "Awaiting Readiness..."}
                        {activeDraft.isReady && (
                          <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-24 flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--muted)]/30 flex items-center justify-center">
                        <svg className="text-[var(--muted)]/30" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <p className="text-sm text-[var(--muted)] italic max-w-[180px]">Your project structure will materialize here as we chat.</p>
                    </div>
                  )}
                </div>
                {brainstormMessages.length > 0 && (
                  <button
                    onClick={clearBrainstorm}
                    className="group flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--muted)] hover:text-red-500 transition-colors self-center py-2"
                  >
                    <svg className="transition-transform group-hover:rotate-90" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Reset Board
                  </button>
                )}
              </div>
            </section>
          )}

          {ui.activeView === "projects" && !selectedProject && (
            <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
              <div>
                <h2 className="text-2xl">Create a project</h2>
                <p className="text-sm text-[var(--muted)]">
                  Anchor your day around one project. The plan follows the project.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Project name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={projectName}
                    onChange={(event) => { setProjectName(event.target.value); setFormErrors(prev => ({ ...prev, name: undefined })); }}
                    className={`rounded-2xl border bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${formErrors.name ? "border-red-400" : "border-transparent"}`}
                    placeholder="e.g. Portfolio redesign"
                  />
                  {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                </div>
                <div className="grid gap-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Daily time budget (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={720}
                    value={projectBudget || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(event) => setProjectBudget(event.target.value === "" ? 0 : Number(event.target.value))}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div className="grid gap-3 md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Project goal <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={projectGoal}
                    onChange={(event) => { setProjectGoal(event.target.value); setFormErrors(prev => ({ ...prev, goal: undefined })); }}
                    rows={3}
                    className={`rounded-2xl border bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${formErrors.goal ? "border-red-400" : "border-transparent"}`}
                    placeholder="e.g. Build and launch the landing page by Friday"
                  />
                  {formErrors.goal && <p className="text-xs text-red-500">{formErrors.goal}</p>}
                </div>
                <div className="grid gap-3 md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Focus notes
                  </label>
                  <textarea
                    value={projectFocus}
                    onChange={(event) => setProjectFocus(event.target.value)}
                    rows={2}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    placeholder="e.g. Keep tasks under 30 min; no new features"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateProject}
                className="w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-0.5"
              >
                Create project
              </button>
              <div className="grid gap-3">
                <h3 className="text-lg">Existing projects</h3>
                {projects.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No projects yet.</p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project.id);
                        setView("plan");
                      }}
                      className="rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {project.constraints.timeBudgetMinutes} mins/day
                      </p>
                      <h4 className="text-lg">{project.name}</h4>
                      <p className="text-sm text-[var(--muted)]">{project.goal}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {ui.activeView === "projects" && selectedProject && (
            <section className="grid gap-8 rounded-[28px] bg-white/80 p-8 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.08)] pb-6">
                <div>
                  <h2 className="text-2xl">Project Settings</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Manage details and milestones for {selectedProject.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProject(undefined)}
                  className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
                >
                  Start New Project
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Project name
                  </label>
                  <input
                    value={selectedProject.name}
                    onChange={(event) => updateProject(selectedProject.id, { name: event.target.value })}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Daily time budget (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={720}
                    value={selectedProject.constraints.timeBudgetMinutes || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(event) => updateProject(selectedProject.id, { constraints: { ...selectedProject.constraints, timeBudgetMinutes: event.target.value === "" ? 0 : Number(event.target.value) } })}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div className="grid gap-3 md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Project goal
                  </label>
                  <textarea
                    value={selectedProject.goal}
                    onChange={(event) => updateProject(selectedProject.id, { goal: event.target.value })}
                    rows={3}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div className="grid gap-3 md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Focus notes
                  </label>
                  <textarea
                    value={selectedProject.constraints.focusNotes || ""}
                    onChange={(event) => updateProject(selectedProject.id, { constraints: { ...selectedProject.constraints, focusNotes: event.target.value } })}
                    rows={2}
                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-[rgba(15,23,42,0.08)] pt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Milestones</h3>
                  <p className="text-sm text-[var(--muted)]">Edit or delete existing milestones.</p>
                </div>

                <div className="grid gap-3">
                  {milestones.filter(m => m.projectId === selectedProject.id).length === 0 && (
                    <p className="text-sm italic text-[var(--muted)]">No milestones created yet.</p>
                  )}
                  {milestones.filter(m => m.projectId === selectedProject.id).map((milestone, index, array) => (
                    <div key={milestone.id} className="flex items-center gap-2 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-2 pr-4 shadow-sm focus-within:ring-2 focus-within:ring-[var(--ring)] transition-all">
                      <div className="flex flex-col gap-0.5 pl-2 pr-1 opacity-40 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveMilestone(milestone.id, "up")}
                          disabled={index === 0}
                          className="flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:text-[var(--muted)]"
                          title="Move up"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                        </button>
                        <button
                          onClick={() => moveMilestone(milestone.id, "down")}
                          disabled={index === array.length - 1}
                          className="flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:text-[var(--muted)]"
                          title="Move down"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                      </div>

                      {editingMilestoneId === milestone.id ? (
                        <>
                          <input
                            className="flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2 text-[15px] focus:outline-none"
                            value={editingMilestoneTitle}
                            onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateMilestone(milestone.id, editingMilestoneTitle);
                                setEditingMilestoneId(null);
                              }
                              if (e.key === "Escape") {
                                setEditingMilestoneId(null);
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              updateMilestone(milestone.id, editingMilestoneTitle);
                              setEditingMilestoneId(null);
                            }}
                            className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:-translate-y-0.5"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMilestoneId(null)}
                            className="rounded-full bg-[rgba(15,23,42,0.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 px-3 py-2 text-[15px] cursor-default">{milestone.title}</div>
                          <button
                            onClick={() => {
                              setEditingMilestoneId(milestone.id);
                              setEditingMilestoneTitle(milestone.title);
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[rgba(15,23,42,0.04)] hover:text-[var(--ink)]"
                            title="Edit milestone name"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMilestone(milestone.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600"
                            title="Delete milestone"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {ui.activeView === "plan" && (
            <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl">Daily plan</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {selectedProject ? selectedProject.goal : "Pick a project to begin."}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--panel)] px-4 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Planned: <span className="font-semibold">{formatMinutes(totalPlanned)}</span>
                    </span>
                    <span className="text-[var(--muted)]">|</span>
                    <span>
                      Budget:{" "}
                      <span className={totalPlanned > budget ? "text-red-600" : "font-semibold"}>
                        {formatMinutes(budget || 0)}
                      </span>{" "}
                      <span className="text-xs text-[var(--muted)]">
                        ({hasBudgetOverride ? "override" : "default"})
                      </span>
                    </span>
                    {!hasBudgetOverride && !showBudgetOverride && (
                      <button
                        type="button"
                        onClick={() => setShowBudgetOverride(true)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:opacity-80"
                      >
                        Override today
                      </button>
                    )}
                    {showBudgetOverride && !hasBudgetOverride && (
                      <button
                        type="button"
                        onClick={() => setShowBudgetOverride(false)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:text-[var(--ink)]"
                      >
                        Cancel
                      </button>
                    )}
                    {hasBudgetOverride && !showBudgetOverride && (
                      <button
                        type="button"
                        onClick={() => setShowBudgetOverride(true)}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:opacity-80"
                      >
                        Edit
                      </button>
                    )}
                    {hasBudgetOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          clearPlanBudgetOverride();
                          setShowBudgetOverride(false);
                        }}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:text-[var(--ink)]"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {showBudgetOverride && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        Override minutes
                      </span>
                      <input
                        type="number"
                        min={30}
                        max={720}
                        value={budgetOverrideDraft}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => setBudgetOverrideDraft(event.target.value)}
                        className="w-28 rounded-xl border border-transparent bg-white px-3 py-1.5 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <span className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">minutes</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (budgetOverrideDraft.trim() === "") {
                            clearPlanBudgetOverride();
                            setShowBudgetOverride(false);
                            return;
                          }
                          const parsed = Number(budgetOverrideDraft);
                          if (!Number.isNaN(parsed) && parsed > 0) {
                            handlePlanBudgetOverrideChange(parsed);
                            setShowBudgetOverride(false);
                          }
                        }}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:opacity-80"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {totalPlanned > budget && budget > 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      Over budget by {formatMinutes(totalPlanned - budget)} - remove a task or adjust estimates.
                    </p>
                  )}
                </div>
              </div>

              {!selectedProject && (
                <div className="rounded-2xl border border-dashed border-[rgba(15,23,42,0.2)] p-6 text-sm text-[var(--muted)]">
                  Select a project to build a plan.
                </div>
              )}

              {selectedProject && (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Milestones - Tasks</p>
                      <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Target Milestone (Optional)</label>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <select
                          className="w-full rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] md:flex-1"
                          value={selectedMilestoneId}
                          onChange={(e) => setSelectedMilestoneId(e.target.value)}
                        >
                          <option value="">Whole Project</option>
                          {projectMilestones.map((m) => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleGenerateTasks()}
                          disabled={isGenerating}
                          className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-xs uppercase tracking-[0.25em] text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 md:self-start"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          </svg>
                          {isGenerating ? "Generating..." : "Generate tasks (AI)"}
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        Pick a milestone to scope AI tasks. Whole Project includes everything.
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        AI uses: <span className="font-semibold">{selectedMilestone?.title || "Whole Project"}</span>
                      </p>
                      {projectMilestones.length === 0 && !showMilestonePrompt && (
                        <div className="rounded-xl border border-dashed border-[rgba(15,23,42,0.15)] bg-white/70 p-3 text-xs text-[var(--muted)]">
                          No milestones yet. Add one or ask AI to propose some before generating tasks.
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsLeftSidebarOpen(true);
                                setTimeout(() => newMilestoneInputRef.current?.focus(), 0);
                              }}
                              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
                            >
                              Add milestone
                            </button>
                            <button
                              type="button"
                              onClick={handleProposeMilestones}
                              disabled={isGeneratingMilestones}
                              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:-translate-y-0.5"
                            >
                              {isGeneratingMilestones ? "Thinking..." : "AI propose milestones"}
                            </button>
                          </div>
                        </div>
                      )}
                      {showMilestonePrompt && projectMilestones.length === 0 && (
                        <div className="rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 text-xs text-[var(--muted)]">
                          No milestones yet. Add one or ask AI to propose some before generating tasks.
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsLeftSidebarOpen(true);
                                setTimeout(() => newMilestoneInputRef.current?.focus(), 0);
                              }}
                              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
                            >
                              Add milestone
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleProposeMilestones();
                                setShowMilestonePrompt(false);
                              }}
                              disabled={isGeneratingMilestones}
                              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:-translate-y-0.5 disabled:opacity-60"
                            >
                              {isGeneratingMilestones ? "Thinking..." : "AI propose milestones"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowMilestonePrompt(false);
                                handleGenerateTasks(true);
                              }}
                              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
                            >
                              Continue with Whole Project
                            </button>
                          </div>
                        </div>
                      )}
                      {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Plan notes (optional)
                      </label>
                      <div className="relative flex items-center focus-within:ring-2 focus-within:ring-[var(--ring)] rounded-2xl shadow-[0_0_0_1px_rgba(15,23,42,0.1)] bg-[var(--panel)]">
                        <textarea
                          value={planNotes}
                          onChange={(event) => setPlanNotes(event.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-2xl border-transparent bg-transparent px-4 py-3 placeholder:text-sm focus:outline-none pr-12"
                          placeholder="Meeting at 2pm. Prioritize shipping the onboarding flow."
                        />
                        <div className="absolute right-2 top-2">
                          <DictationMic
                            isRecording={activeRecordingField === "planNotes"}
                            onClick={() => {
                              if (activeRecordingField === "planNotes") stopRecording();
                              else startRecording("planNotes", (text) => setPlanNotes((prev) => (prev ? `${prev}\n${text}` : text)), "Context: These are raw planning notes for the day.");
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 flex items-center">
                        <input
                          value={manualTitle}
                          onChange={(event) => setManualTitle(event.target.value)}
                          placeholder="Add a manual task"
                          className="w-full rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 pr-10 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <div className="absolute right-1">
                          <DictationMic
                            isRecording={activeRecordingField === "manualTitle"}
                            onClick={() => {
                              if (activeRecordingField === "manualTitle") stopRecording();
                              else {
                                const msContext = selectedMilestone ? ` Milestone: ${selectedMilestone.title}` : "";
                                startRecording("manualTitle", (text) => setManualTitle(text), `Context: I am dictating a short, actionable task title.${msContext}`);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={manualEstimate || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => setManualEstimate(event.target.value === "" ? 0 : Number(event.target.value))}
                        className="w-24 rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <button
                        onClick={handleAddManualTask}
                        className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {planTasks.length === 0 && (
                      <p className="text-sm text-[var(--muted)]">No tasks yet for this day.</p>
                    )}
                    {planTasks.map((task) => {
                      const isLong = task.title.length > 80;
                      return (
                        <div
                          key={task.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 shadow-sm"
                        >
                          <div className="min-w-[220px] flex-1">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              {task.source === "ai" ? "AI task" : "Manual task"}
                            </p>
                            <h4
                              className={`text-lg ${isLong ? "line-clamp-2 cursor-pointer hover:opacity-80" : ""}`}
                              onClick={(e) => {
                                if (isLong) {
                                  const el = e.currentTarget;
                                  el.classList.toggle("line-clamp-2");
                                }
                              }}
                              title={isLong ? "Click to expand" : undefined}
                            >{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-[var(--muted)]">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={5}
                              max={240}
                              value={task.estimateMinutes || ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(event) =>
                                updateTaskEstimate(task.id, event.target.value === "" ? 0 : Number(event.target.value))
                              }
                              className="w-20 rounded-xl border border-transparent bg-[var(--panel)] px-2 py-1 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                            <button
                              onClick={() => {
                                setFocusTask(task.id);
                                setView("focus");
                              }}
                              className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                            >
                              Focus
                            </button>
                            <button
                              onClick={() =>
                                updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")
                              }
                              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] shadow transition ${task.status === "done"
                                ? "bg-emerald-500 text-white"
                                : "border border-[rgba(15,23,42,0.12)] bg-white text-[var(--ink)]"
                                }`}
                            >
                              {task.status === "done" ? "Done" : "Mark done"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {ui.activeView === "focus" && (
            <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl">Focus view</h2>
                  <p className="text-sm text-[var(--muted)]">Lock onto one task at a time.</p>
                </div>
                <button
                  onClick={() => setView("plan")}
                  className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                >
                  Back to plan
                </button>
              </div>
              {!focusTask && (
                <p className="text-sm text-[var(--muted)]">No focus task. Pick one from the plan.</p>
              )}
              {focusTask && (
                <div className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {selectedProject?.name}
                  </p>
                  <h3 className="text-2xl">{focusTask.title}</h3>
                  {focusTask.description && (
                    <p className="text-sm text-[var(--muted)]">{focusTask.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[var(--panel)] px-4 py-2 text-sm">
                      Estimate: {formatMinutes(focusTask.estimateMinutes)}
                    </span>
                    <span className="rounded-full bg-[var(--panel)] px-4 py-2 text-sm">
                      Status: {focusTask.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => updateTaskStatus(focusTask.id, "doing")}
                      className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => updateTaskStatus(focusTask.id, "done")}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white shadow transition hover:-translate-y-0.5"
                    >
                      Mark done
                    </button>
                    <button
                      onClick={() => setFocusTask(undefined)}
                      className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                    >
                      Clear focus
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {ui.activeView === "history" && (
            <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
              <div>
                <h2 className="text-2xl">History & analytics</h2>
                <p className="text-sm text-[var(--muted)]">
                  Track momentum by project and by day.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {perProjectStats.map(({ project, completed, total }) => (
                  <div
                    key={project.id}
                    className="rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      {project.name}
                    </p>
                    <h3 className="text-xl">
                      {completed} / {total} tasks complete
                    </h3>
                    <div className="mt-3 h-2 w-full rounded-full bg-[var(--panel)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent-2)]"
                        style={{
                          width: total === 0 ? "0%" : `${Math.round((completed / total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No project data yet.</p>
                )}
              </div>

              {selectedProject && (() => {
                const daysWithData = projectHistory.filter(e => e.total > 0);
                if (daysWithData.length === 0) {
                  return (
                    <div className="rounded-[24px] border border-dashed border-[rgba(15,23,42,0.2)] p-6 text-center text-sm text-[var(--muted)]">
                      No history yet — complete your first task to start tracking.
                    </div>
                  );
                }
                return (
                  <div className="grid gap-3 rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 shadow-sm">
                    <h3 className="text-lg">Last {daysWithData.length} day{daysWithData.length !== 1 ? "s" : ""} with activity</h3>
                    <div className="grid gap-2">
                      {daysWithData.map((entry) => (
                        <div
                          key={entry.date}
                          className="flex items-center gap-3 rounded-full bg-[var(--panel)] px-4 py-2"
                        >
                          <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            {entry.date}
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full bg-[var(--accent)]"
                              style={{ width: `${Math.min(entry.total * 20, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{entry.total} done</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 text-sm text-[var(--muted)] shadow-sm">
                {progressEntries.length} progress events logged.
              </div>
            </section>
          )}
        </div>
      </div>
    </main>

    {/* RIGHT SIDEBAR: Activity Log */}
    {!isFirstRun && ui.activeView !== "brainstorm" && (
      <aside className="no-scrollbar flex w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-[rgba(15,23,42,0.08)] bg-white/60 p-6 shadow-sm transition-all duration-600 ease-out">
        <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Activity Trail
        </h3>
        <div className="flex flex-col gap-4">
          {!selectedProject && <p className="text-sm text-[var(--muted)] italic">Select a project.</p>}
          {selectedProject && activities.filter((a) => a.projectId === selectedProject.id).length === 0 && (
            <p className="text-sm text-[var(--muted)]">No activity logged yet.</p>
          )}
          {selectedProject && activities.filter((a) => a.projectId === selectedProject.id).map((activity) => (
            <div key={activity.id} className="flex gap-3 text-sm">
              <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" />
              <div>
                <p className="text-[var(--ink)]">{activity.description}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    )}
  </div>
);
}
