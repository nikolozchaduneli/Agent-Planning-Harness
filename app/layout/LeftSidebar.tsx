"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import DictationMic from "@/app/components/DictationMic";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";
import useAiGeneration from "@/app/hooks/useAiGeneration";

const styles = {
  wrapper:
    "fixed inset-y-0 left-0 z-30 flex-shrink-0 overflow-hidden transition-all duration-600 ease-out md:relative md:inset-auto md:z-auto",
  toggleButton:
    "absolute top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5",
  aside:
    "no-scrollbar flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto bg-white/60 shadow-sm transition-all duration-600 ease-out md:overflow-hidden",
  dropdownButton:
    "flex w-full items-center justify-between gap-2 rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
  dropdownPanel:
    "absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/95 p-2 shadow-lg backdrop-blur",
  dropdownItem:
    "flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ink)] text-left transition hover:bg-[var(--panel)]",
};

type LeftSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function LeftSidebar({ isOpen, onToggle }: LeftSidebarProps) {
  const formatProjectName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return name;
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  };

  const {
    projects,
    tasks,
    dailyPlans,
    milestones,
    ui,
    setSelectedProject,
    setView,
    createMilestone,
    updateMilestoneStatus,
    addActivity,
  } = useAppStore(
    useShallow((state) => ({
      projects: state.projects,
      tasks: state.tasks,
      dailyPlans: state.dailyPlans,
      milestones: state.milestones,
      ui: state.ui,
      setSelectedProject: state.setSelectedProject,
      setView: state.setView,
      createMilestone: state.createMilestone,
      updateMilestoneStatus: state.updateMilestoneStatus,
      addActivity: state.addActivity,
    })),
  );

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const activeProjectButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [showFullGoal, setShowFullGoal] = useState(false);
  const [planningMilestoneId, setPlanningMilestoneId] = useState<string>("");
  const newMilestoneInputRef = useRef<HTMLInputElement | null>(null);

  const { startRecording, stopRecording, activeRecordingField } = useVoiceRecording();
  const { handleProposeMilestones, isGeneratingMilestones } = useAiGeneration(
    selectedProject?.id,
  );

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!showProjectDropdown && !showNameDropdown) return;
      const target = event.target as Node;
      const button = activeProjectButtonRef.current;
      const panel = dropdownPanelRef.current;
      if (button?.contains(target)) return;
      if (panel?.contains(target)) return;
      setShowProjectDropdown(false);
      setShowNameDropdown(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [showProjectDropdown, showNameDropdown]);

  useEffect(() => {
    const handlePlanningChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail ?? "";
      setPlanningMilestoneId(detail);
    };
    window.addEventListener("planning-milestone-change", handlePlanningChange as EventListener);
    return () => {
      window.removeEventListener("planning-milestone-change", handlePlanningChange as EventListener);
    };
  }, []);

  const handleAddMilestone = () => {
    if (!selectedProject || !newMilestoneTitle.trim()) return;
    createMilestone(selectedProject.id, newMilestoneTitle.trim());
    addActivity(selectedProject.id, `Created milestone: ${newMilestoneTitle.trim()}`);
    setNewMilestoneTitle("");
  };

  const projectProgress = useMemo(() => {
    if (!selectedProject) return null;
    const projectTasks = tasks.filter(
      (task) =>
        task.projectId === selectedProject.id &&
        dailyPlans.some(
          (plan) => plan.projectId === selectedProject.id && plan.taskIds.includes(task.id),
        ),
    );
    const doneTasks = projectTasks.filter((task) => task.status === "done");
    const pct = projectTasks.length
      ? Math.min(100, (doneTasks.length / projectTasks.length) * 100)
      : 0;
    return { doneTasks: doneTasks.length, total: projectTasks.length, pct };
  }, [dailyPlans, selectedProject, tasks]);

  return (
    <div className={`${styles.wrapper} ${isOpen ? "w-[min(360px,92vw)] sm:w-[360px]" : "w-12"}`}>
      <button
        onClick={onToggle}
        className={`${styles.toggleButton} ${isOpen ? "right-2" : "left-1/2 -translate-x-[32%]"
          }`}
        title={isOpen ? "Hide sidebar" : "Show sidebar"}
        aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
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
        className={`${styles.aside} ${isOpen
          ? "translate-x-0 border-r border-[var(--border-subtle)] p-6 opacity-100"
          : "-translate-x-4 border-r-0 p-0 opacity-0 pointer-events-none"
          }`}
      >
        <div
          onClick={() => {
            if (showProjectDropdown) setShowProjectDropdown(false);
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="text-sm font-semibold text-[var(--muted)]">
              Planner
            </h1>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <label className="text-sm font-medium text-[var(--muted)]">
              Active Project
            </label>
            {!selectedProject && (
              <div className="relative mt-1">
                <button
                  ref={activeProjectButtonRef}
                  id="active-project-select"
                  type="button"
                  className={styles.dropdownButton}
                  onClick={() => setShowProjectDropdown((prev) => !prev)}
                >
                  <span className="text-[var(--muted)]">Select project</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {showProjectDropdown && (
                  <div ref={dropdownPanelRef} className={styles.dropdownPanel}>
                    {projects.length === 0 && (
                      <div className="px-3 py-2 text-sm text-[var(--muted)]">
                        No projects yet.
                      </div>
                    )}
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className={styles.dropdownItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedProject(project.id);
                          setShowProjectDropdown(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                          {formatProjectName(project.name)}
                        </span>
                        {ui.selectedProjectId === project.id && (
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedProject ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="relative">
                  <button
                    ref={activeProjectButtonRef}
                    id="active-project-select"
                    type="button"
                    className="group flex w-full items-start justify-between gap-2 rounded-lg -mx-1 px-1 py-0.5 text-left text-2xl font-bold font-serif leading-tight tracking-[-0.02em] text-[var(--ink)] transition hover:shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    onClick={() => setShowNameDropdown((prev) => !prev)}
                  >
                    <span className="min-w-0 flex-1 break-words whitespace-normal">
                      {formatProjectName(selectedProject.name)}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-1 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--ink)]"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showNameDropdown && (
                    <div ref={dropdownPanelRef} className={`${styles.dropdownPanel} w-full`}>
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          className={styles.dropdownItem}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSelectedProject(project.id);
                            setShowNameDropdown(false);
                          }}
                        >
                          <span className="min-w-0 flex-1 break-words whitespace-normal">
                            {formatProjectName(project.name)}
                          </span>
                          {ui.selectedProjectId === project.id && (
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                              Active
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setView("projects")}
                  className="flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] p-1.5 text-[var(--muted)] transition hover:bg-[rgba(15,23,42,0.08)] hover:text-[var(--ink)]"
                  title="Edit Project Settings"
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <p
                  className={`text-sm text-[var(--muted)] break-words ${showFullGoal ? "" : "line-clamp-4"
                    }`}
                >
                  {selectedProject.goal}
                </p>
                {selectedProject.goal.length > 200 && (
                  <button
                    type="button"
                    onClick={() => setShowFullGoal((prev) => !prev)}
                    className="w-fit text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] transition hover:opacity-80"
                  >
                    {showFullGoal ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              <div className="mt-2 rounded-xl border border-[rgba(15,23,42,0.05)] bg-white p-3 shadow-sm">
                <p className="text-sm font-semibold text-[var(--muted)]">
                  Progress
                </p>
                {projectProgress && (
                  <>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(15,23,42,0.08)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)] transition-all"
                        style={{ width: `${projectProgress.pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      {projectProgress.doneTasks} of {projectProgress.total} tasks done
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 pb-1 md:flex md:min-h-0 md:flex-1 md:flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--muted)]">
                  Milestones
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleProposeMilestones}
                    disabled={isGeneratingMilestones}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:opacity-80 transition disabled:opacity-50"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="overflow-visible"
                      aria-hidden="true"
                    >
                      <path d="m5 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                      <path d="m19 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
                    </svg>
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
              <div className="no-scrollbar flex min-h-[120px] max-h-[40vh] flex-col gap-2 overflow-y-auto pr-2 -mr-2 md:min-h-0 md:flex-1 md:max-h-none md:pr-6 md:-mr-6">
                {milestones
                  .filter((milestone) => milestone.projectId === selectedProject.id)
                  .map((milestone) => (
                    <div
                      key={milestone.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("planning-milestone-select", { detail: milestone.id }),
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          window.dispatchEvent(
                            new CustomEvent("planning-milestone-select", { detail: milestone.id }),
                          );
                        }
                      }}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm transition cursor-pointer hover:border-[rgba(15,23,42,0.15)] hover:bg-[rgba(15,23,42,0.02)] ${milestone.status === "completed"
                        ? "border-[rgba(15,23,42,0.05)] bg-white/50 opacity-60"
                        : planningMilestoneId === milestone.id
                          ? "border-[var(--accent)] bg-[rgba(249,115,22,0.08)] shadow-sm"
                          : "border-[rgba(15,23,42,0.05)] bg-white shadow-sm"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={milestone.status === "completed"}
                        onChange={(e) =>
                          updateMilestoneStatus(
                            milestone.id,
                            e.target.checked ? "completed" : "active",
                          )
                        }
                        onClick={(event) => event.stopPropagation()}
                        className="mt-0.5 rounded border-gray-300 text-[var(--accent)]"
                      />
                      <div className="flex flex-1 items-start justify-between gap-2">
                        <span className={milestone.status === "completed" ? "line-through" : ""}>
                          {milestone.title}
                        </span>
                        {planningMilestoneId === milestone.id && (
                          <span className="rounded-full border border-[var(--accent)]/40 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                            Planning
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-1 grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      id="new-milestone-input"
                      type="text"
                      placeholder="New milestone..."
                      ref={newMilestoneInputRef}
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddMilestone();
                      }}
                      className="w-full rounded-lg border-transparent bg-white px-3 py-2 pr-10 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <div className="absolute right-1">
                      <DictationMic
                        isRecording={activeRecordingField === "newMilestone"}
                        onClick={() => {
                          if (activeRecordingField === "newMilestone") stopRecording();
                          else
                            startRecording(
                              "newMilestone",
                              (text) => setNewMilestoneTitle(text),
                              "Context: I am adding a new milestone to the project.",
                            );
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-0.5"
                  >
                    Add
                  </button>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Press Enter or click Add to create a milestone
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm italic text-[var(--muted)]">Select a project to view context.</div>
        )}
      </aside>
    </div>
  );
}
