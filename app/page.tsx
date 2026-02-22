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

export default function Home() {
  const {
    projects,
    tasks,
    dailyPlans,
    progressEntries,
    ui,
    hydrate,
    setView,
    setDate,
    setSelectedProject,
    createProject,
    updateProjectStatus,
    addProjectMilestone,
    updateProjectMilestone,
    removeProjectMilestone,
    upsertDailyPlan,
    addTasks,
    attachTasksToPlan,
    updateTaskStatus,
    updateTaskEstimate,
    setFocusTask,
    setLastTranscript,
    setLastVoicePrompt,
  } = useAppStore();

  const [projectName, setProjectName] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectBudget, setProjectBudget] = useState(240);
  const [projectFocus, setProjectFocus] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [showMilestones, setShowMilestones] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [planNotes, setPlanNotes] = useState("");
  const [notesFromVoice, setNotesFromVoice] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualEstimate, setManualEstimate] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const selectedDate = ui.selectedDate || isoToday();

  const getProjectPercent = (project: typeof selectedProject) => {
    if (!project?.status?.milestones) return 0;
    const total = project.status.milestones.length;
    if (total === 0) return 0;
    const done = project.status.milestones.filter((milestone) => milestone.done).length;
    return Math.round((done / total) * 100);
  };

  const selectedProjectPercent = getProjectPercent(selectedProject);
  const selectedProjectMilestones = selectedProject?.status?.milestones ?? [];
  const selectedMilestonesDone = selectedProjectMilestones.filter(
    (milestone) => milestone.done,
  ).length;

  const activePlan = useMemo(() => {
    if (!selectedProject) return undefined;
    return dailyPlans.find(
      (plan) => plan.projectId === selectedProject.id && plan.date === selectedDate,
    );
  }, [dailyPlans, selectedDate, selectedProject]);

  const planTaskIds = activePlan?.taskIds ?? [];
  const planTasks = tasks.filter((task) => planTaskIds.includes(task.id));
  const totalPlanned = planTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const budget = activePlan?.timeBudgetMinutes ?? selectedProject?.constraints.timeBudgetMinutes ?? 0;

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
    if (!projectName.trim() || !projectGoal.trim()) return;
    const project = createProject({
      name: projectName.trim(),
      goal: projectGoal.trim(),
      constraints: {
        timeBudgetMinutes: projectBudget,
        focusNotes: projectFocus.trim() || undefined,
      },
    });
    setSelectedProject(project.id);
    setView("plan");
    setProjectName("");
    setProjectGoal("");
    setProjectFocus("");
  };

  const ensurePlan = () => {
    if (!selectedProject) return;
    if (activePlan) return;
    const plan: DailyPlan = {
      id: crypto.randomUUID(),
      projectId: selectedProject.id,
      date: selectedDate,
      taskIds: [],
      timeBudgetMinutes: selectedProject.constraints.timeBudgetMinutes,
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

  const handleGenerateTasks = async () => {
    if (!selectedProject) return;
    setIsGenerating(true);
    setAiError(null);
    ensurePlan();
    try {
      const milestoneSummary = selectedProject.status?.milestones ?? [];
      const response = await fetch("/api/ai/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          goal: selectedProject.goal,
          constraints: selectedProject.constraints,
          timeBudgetMinutes: budget || selectedProject.constraints.timeBudgetMinutes,
          notes: planNotes.trim() || undefined,
          status: selectedProject.status
            ? {
                phase: selectedProject.status.phase,
                note: selectedProject.status.note,
                milestones: milestoneSummary.map((milestone) => ({
                  title: milestone.title,
                  done: milestone.done,
                })),
              }
            : undefined,
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

  const handlePlanBudgetChange = (value: number) => {
    if (!selectedProject) return;
    ensurePlan();
    const plan: DailyPlan = activePlan
      ? { ...activePlan, timeBudgetMinutes: value }
      : {
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          date: selectedDate,
          taskIds: [],
          timeBudgetMinutes: value,
          createdAt: new Date().toISOString(),
        };
    upsertDailyPlan(plan);
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

  const uploadAudio = async (blob: Blob) => {
    const form = new FormData();
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("file", blob, "recording.webm");
    const prompt = buildTranscriptionPrompt();
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
    setNotesFromVoice(transcript);
  };

  const startRecording = async () => {
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
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        setVoiceLoading(true);
        try {
          await uploadAudio(audioBlob);
        } catch (error) {
          setVoiceError((error as Error).message);
        } finally {
          setVoiceLoading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  };

  const handleVoiceCapture = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    await startRecording();
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
    <div className="min-h-screen px-6 py-10 text-[15px]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[32px] bg-[var(--panel)]/90 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
                Task Centric Planner
              </p>
              <h1 className="text-3xl md:text-4xl">Plan the day. Finish the work.</h1>
              {selectedProject && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {selectedProject.status?.phase ?? "planning"} ·{" "}
                  {selectedProjectPercent}% complete · Updated{" "}
                  {selectedProject.status?.updatedAt
                    ? selectedProject.status.updatedAt.slice(0, 10)
                    : "n/a"}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["projects", "plan", "focus", "history"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setView(view)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                    ui.activeView === view
                      ? "border-transparent bg-[var(--accent)] text-white shadow"
                      : "border-[rgba(15,23,42,0.12)] bg-white/80 text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Project
              </label>
              <select
                className="w-full rounded-xl border border-transparent bg-white/80 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-transparent bg-white/80 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleVoiceCapture}
                className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {voiceLoading
                  ? "Transcribing..."
                  : isRecording
                    ? "Stop recording"
                    : "Record voice"}
              </button>
              <span>
                {voiceError
                  ? `Voice error: ${voiceError}`
                  : ui.lastTranscript
                    ? `Transcript ready`
                    : "Voice ready"}
              </span>
              <button
                onClick={() => setIsVoiceOpen((prev) => !prev)}
                className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]"
              >
                {isVoiceOpen ? "Hide details" : "Show details"}
              </button>
            </div>
            {notesFromVoice && (
              <button
                onClick={applyVoiceToNotes}
                className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
              >
                Use transcript in notes
              </button>
            )}
            {isVoiceOpen && (
              <div className="mt-3 w-full rounded-2xl bg-white/80 p-4 text-xs text-[var(--muted)]">
                {ui.lastTranscript ? (
                  <p className="mb-2">Transcript: {ui.lastTranscript}</p>
                ) : (
                  <p className="mb-2">No transcript yet.</p>
                )}
                {ui.lastVoicePrompt && <p>Prompt: {ui.lastVoicePrompt}</p>}
              </div>
            )}
          </div>
        </header>

        {ui.activeView === "projects" && (
          <section className="grid gap-6 rounded-[28px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)]">
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div>
                  <h2 className="text-2xl">Create a project</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Anchor your day around one project. The plan follows the project.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Project name
                    </label>
                    <input
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      placeholder="Ship the landing page"
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
                      value={projectBudget}
                      onChange={(event) => setProjectBudget(Number(event.target.value))}
                      className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                  <div className="grid gap-3 md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Project goal
                    </label>
                    <textarea
                      value={projectGoal}
                      onChange={(event) => setProjectGoal(event.target.value)}
                      rows={3}
                      className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      placeholder="Launch the MVP with daily planning, AI tasks, and progress tracking."
                    />
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
                      placeholder="Avoid rabbit holes; 25-minute tasks; keep scope small."
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg">Existing projects</h3>
                    {selectedProject && (
                      <button
                        onClick={() => setView("plan")}
                        className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                      >
                        Open plan
                      </button>
                    )}
                  </div>
                  {projects.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">No projects yet.</p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {projects.map((project) => {
                      const milestoneTotal = project.status?.milestones?.length ?? 0;
                      const milestoneDone =
                        project.status?.milestones?.filter((milestone) => milestone.done)
                          .length ?? 0;
                      const percent = getProjectPercent(project);
                      const isSelected = project.id === selectedProject?.id;
                      return (
                        <div
                          key={project.id}
                          className={`rounded-2xl border bg-white/90 p-4 text-left transition ${
                            isSelected ? "border-[var(--accent)] shadow-sm" : "border-[rgba(15,23,42,0.12)]"
                          }`}
                        >
                          <button
                            onClick={() => setSelectedProject(project.id)}
                            className="w-full text-left"
                          >
                            <p className="text-xs text-[var(--muted)]">
                              {project.constraints.timeBudgetMinutes} mins/day
                            </p>
                            <h4 className="text-lg">{project.name}</h4>
                            <p className="text-sm text-[var(--muted)] max-h-10 overflow-hidden">
                              {project.goal}
                            </p>
                            <p className="mt-3 text-xs text-[var(--muted)]">
                              {project.status?.phase ?? "planning"} · {percent}% complete ·{" "}
                              {milestoneDone}/{milestoneTotal} milestones
                            </p>
                            {project.status?.note && (
                              <p
                                className="mt-2 text-sm text-[var(--muted)] truncate"
                                title={project.status.note}
                              >
                                {project.status.note}
                              </p>
                            )}
                          </button>
                          {isSelected && (
                            <div className="mt-4 border-t border-[rgba(15,23,42,0.08)] pt-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h5 className="text-sm font-semibold">Project status</h5>
                                  <p className="text-xs text-[var(--muted)]">
                                    Updated{" "}
                                    {selectedProject.status?.updatedAt?.slice(0, 10) ?? "n/a"}
                                  </p>
                                </div>
                                <span className="text-xs text-[var(--muted)]">
                                  {selectedProjectPercent}% complete
                                </span>
                              </div>
                              <div className="mt-3 grid gap-3">
                                <div className="grid gap-2">
                                  <label className="text-xs text-[var(--muted)]">Phase</label>
                                  <select
                                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                    value={selectedProject.status?.phase ?? "planning"}
                                    onChange={(event) =>
                                      updateProjectStatus(selectedProject.id, {
                                        phase: event.target.value as
                                          | "discovery"
                                          | "planning"
                                          | "build"
                                          | "QA"
                                          | "launch"
                                          | "maintenance",
                                      })
                                    }
                                  >
                                    <option value="discovery">Discovery</option>
                                    <option value="planning">Planning</option>
                                    <option value="build">Build</option>
                                    <option value="QA">QA</option>
                                    <option value="launch">Launch</option>
                                    <option value="maintenance">Maintenance</option>
                                  </select>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-xs text-[var(--muted)]">
                                    Status note
                                  </label>
                                  <input
                                    value={selectedProject.status?.note ?? ""}
                                    onChange={(event) =>
                                      updateProjectStatus(selectedProject.id, {
                                        note: event.target.value,
                                      })
                                    }
                                    className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                    placeholder="Blocked on API review."
                                  />
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs text-[var(--muted)]">
                                    Milestones {selectedMilestonesDone}/
                                    {selectedProjectMilestones.length}
                                  </p>
                                  <button
                                    onClick={() => setShowMilestones((prev) => !prev)}
                                    className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]"
                                  >
                                    {showMilestones ? "Hide" : "Manage"}
                                  </button>
                                </div>
                                {showMilestones && (
                                  <>
                                    <div className="grid gap-2">
                                      {selectedProjectMilestones.length === 0 && (
                                        <p className="text-sm text-[var(--muted)]">
                                          No milestones yet. Add the key outcomes you want to track.
                                        </p>
                                      )}
                                      {selectedProjectMilestones.map((milestone) => (
                                        <div
                                          key={milestone.id}
                                          className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--panel)] px-3 py-2"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={milestone.done}
                                            onChange={(event) =>
                                              updateProjectMilestone(
                                                selectedProject.id,
                                                milestone.id,
                                                {
                                                  done: event.target.checked,
                                                },
                                              )
                                            }
                                            className="h-4 w-4"
                                          />
                                          <input
                                            value={milestone.title}
                                            onChange={(event) =>
                                              updateProjectMilestone(
                                                selectedProject.id,
                                                milestone.id,
                                                {
                                                  title: event.target.value,
                                                },
                                              )
                                            }
                                            className="flex-1 rounded-lg border border-transparent bg-white/80 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                          />
                                          <button
                                            onClick={() =>
                                              removeProjectMilestone(
                                                selectedProject.id,
                                                milestone.id,
                                              )
                                            }
                                            className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <input
                                        value={newMilestoneTitle}
                                        onChange={(event) =>
                                          setNewMilestoneTitle(event.target.value)
                                        }
                                        placeholder="Add a milestone"
                                        className="flex-1 rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                      />
                                      <button
                                        onClick={() => {
                                          if (!newMilestoneTitle.trim()) return;
                                          addProjectMilestone(
                                            selectedProject.id,
                                            newMilestoneTitle.trim(),
                                          );
                                          setNewMilestoneTitle("");
                                        }}
                                        className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                Planned: <span className="font-semibold">{formatMinutes(totalPlanned)}</span> ·
                Budget:{" "}
                <span className={totalPlanned > budget ? "text-red-600" : "font-semibold"}>
                  {formatMinutes(budget || 0)}
                </span>
              </div>
            </div>

            {!selectedProject && (
              <div className="rounded-2xl border border-dashed border-[rgba(15,23,42,0.2)] p-6 text-sm text-[var(--muted)]">
                Select a project to build a plan.
              </div>
            )}

            {selectedProject && (
              <>
                <div className="grid gap-2 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg">Project status</h3>
                      <p className="text-sm text-[var(--muted)]">
                        Phase: {selectedProject.status?.phase ?? "planning"} ·{" "}
                        {selectedProjectPercent}% complete · Updated{" "}
                        {selectedProject.status?.updatedAt?.slice(0, 10) ?? "n/a"}
                      </p>
                    </div>
                    <button
                      onClick={() => setView("projects")}
                      className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]"
                    >
                      Edit status
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {selectedMilestonesDone}/{selectedProjectMilestones.length} milestones ·{" "}
                    {selectedProject.status?.note || "No status note"}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <div className="grid gap-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Plan notes (optional)
                    </label>
                    <textarea
                      value={planNotes}
                      onChange={(event) => setPlanNotes(event.target.value)}
                      rows={3}
                      className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      placeholder="Meeting at 2pm. Prioritize shipping the onboarding flow."
                    />
                  </div>
                  <div className="grid gap-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Daily budget (minutes)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={720}
                      value={budget}
                      onChange={(event) => handlePlanBudgetChange(Number(event.target.value))}
                      className="rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <button
                      onClick={handleGenerateTasks}
                      disabled={isGenerating}
                      className="rounded-full bg-[var(--accent)] px-5 py-3 text-xs uppercase tracking-[0.25em] text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {isGenerating ? "Generating..." : "Generate tasks"}
                    </button>
                    {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={manualTitle}
                      onChange={(event) => setManualTitle(event.target.value)}
                      placeholder="Add a manual task"
                      className="flex-1 rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={manualEstimate}
                      onChange={(event) => setManualEstimate(Number(event.target.value))}
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
                  {planTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 shadow-sm"
                    >
                      <div className="min-w-[220px] flex-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {task.source === "ai" ? "AI task" : "Manual task"}
                        </p>
                        <h4 className="text-lg">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-[var(--muted)]">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={task.estimateMinutes}
                          onChange={(event) =>
                            updateTaskEstimate(task.id, Number(event.target.value))
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
                          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] shadow transition ${
                            task.status === "done"
                              ? "bg-emerald-500 text-white"
                              : "border border-[rgba(15,23,42,0.12)] bg-white text-[var(--ink)]"
                          }`}
                        >
                          {task.status === "done" ? "Done" : "Mark done"}
                        </button>
                      </div>
                    </div>
                  ))}
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

            {selectedProject && (
              <div className="grid gap-3 rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 shadow-sm">
                <h3 className="text-lg">Last 10 days</h3>
                <div className="grid gap-2">
                  {projectHistory.map((entry) => (
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
            )}

            <div className="rounded-[24px] border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 text-sm text-[var(--muted)] shadow-sm">
              {progressEntries.length} progress events logged.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
