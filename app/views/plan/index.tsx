"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatMinutes, isoToday } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { DailyPlan, Task } from "@/lib/types";
import useAiGeneration from "@/app/hooks/useAiGeneration";
import useBudgetDisplay from "@/app/hooks/useBudgetDisplay";
import useStickyRegenBar from "@/app/hooks/useStickyRegenBar";
import DictationMic from "@/app/components/DictationMic";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";
import TaskCard from "@/app/components/TaskCard";
import BudgetBar from "@/app/views/plan/BudgetBar";
import MilestoneSelector from "@/app/views/plan/MilestoneSelector";
import ManualTaskForm from "@/app/views/plan/ManualTaskForm";
import StickyRegenBar from "@/app/views/plan/StickyRegenBar";

const MIN_PLAN_BUDGET_MINUTES = 30;
const MAX_PLAN_BUDGET_MINUTES = 720;

const clampPlanBudgetMinutes = (value: number) =>
  Math.max(MIN_PLAN_BUDGET_MINUTES, Math.min(MAX_PLAN_BUDGET_MINUTES, value || 0));

const createDailyPlan = (
  projectId: string,
  date: string,
  timeBudgetOverrideMinutes?: number,
): DailyPlan => ({
  id: crypto.randomUUID(),
  projectId,
  date,
  taskIds: [],
  timeBudgetOverrideMinutes,
  createdAt: new Date().toISOString(),
});

const createManualTask = (
  projectId: string,
  title: string,
  estimateMinutes: number,
  milestoneId?: string,
): Task => ({
  id: crypto.randomUUID(),
  projectId,
  title,
  estimateMinutes,
  status: "todo",
  createdAt: new Date().toISOString(),
  source: "manual",
  milestoneId: milestoneId || undefined,
});

type PlanTaskGroup = {
  key: string;
  label: string;
  tasks: Task[];
  totalMinutes: number;
  sortOrder: number;
};

export default function PlanView() {
  const projects = useAppStore((state) => state.projects);
  const tasks = useAppStore((state) => state.tasks);
  const dailyPlans = useAppStore((state) => state.dailyPlans);
  const milestones = useAppStore((state) => state.milestones);
  const ui = useAppStore((state) => state.ui);
  const addTasks = useAppStore((state) => state.addTasks);
  const attachTasksToPlan = useAppStore((state) => state.attachTasksToPlan);
  const updateTaskStatus = useAppStore((state) => state.updateTaskStatus);
  const updateTaskEstimate = useAppStore((state) => state.updateTaskEstimate);
  const updateTaskDetails = useAppStore((state) => state.updateTaskDetails);
  const toggleTaskPinned = useAppStore((state) => state.toggleTaskPinned);
  const removeTasks = useAppStore((state) => state.removeTasks);
  const detachTasksFromPlan = useAppStore((state) => state.detachTasksFromPlan);
  const removeProgressEntriesForTasks = useAppStore((state) => state.removeProgressEntriesForTasks);
  const setFocusTask = useAppStore((state) => state.setFocusTask);
  const setView = useAppStore((state) => state.setView);
  const upsertDailyPlan = useAppStore((state) => state.upsertDailyPlan);
  const setPlanMilestoneForProject = useAppStore((state) => state.setPlanMilestoneForProject);

  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);
  const selectedDate = ui.selectedDate || isoToday();

  const [planNotes, setPlanNotes] = useState("");
  const [notesFromVoice, setNotesFromVoice] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualEstimate, setManualEstimate] = useState(25);
  const [pendingManualTaskScroll, setPendingManualTaskScroll] = useState(false);
  const [showMilestonePrompt, setShowMilestonePrompt] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const sidebarMilestoneSelectRef = useRef(false);
  const newestTaskRef = useRef<HTMLDivElement | null>(null);
  const planMilestoneByProject = ui.planMilestoneByProject ?? {};
  const selectedMilestoneId =
    selectedProject ? (planMilestoneByProject[selectedProject.id] ?? "") : "";
  const setSelectedMilestoneId = (value: string) => {
    if (!selectedProject) return;
    setPlanMilestoneForProject(selectedProject.id, value);
  };

  const activePlan = useMemo(() => {
    if (!selectedProject) return undefined;
    return dailyPlans.find(
      (plan) => plan.projectId === selectedProject.id && plan.date === selectedDate,
    );
  }, [dailyPlans, selectedDate, selectedProject]);

  const planTaskIds = useMemo(() => activePlan?.taskIds ?? [], [activePlan?.taskIds]);
  const planTasks = useMemo(() => {
    if (!planTaskIds.length) return [];
    const idSet = new Set(planTaskIds);
    return tasks.filter((task) => idSet.has(task.id));
  }, [planTaskIds, tasks]);

  const totalPlanned = planTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const budget =
    activePlan?.timeBudgetOverrideMinutes ?? selectedProject?.constraints.timeBudgetMinutes ?? 0;
  const hasBudgetOverride = typeof activePlan?.timeBudgetOverrideMinutes === "number";

  const projectMilestones = useMemo(() => {
    if (!selectedProject) return [];
    return milestones.filter((milestone) => milestone.projectId === selectedProject.id);
  }, [milestones, selectedProject]);
  const milestoneTitleById = useMemo(() => {
    const map = new Map<string, string>();
    projectMilestones.forEach((milestone, index) => {
      map.set(milestone.id, milestone.title || `Milestone ${index + 1}`);
    });
    return map;
  }, [projectMilestones]);
  const selectedMilestone = selectedMilestoneId
    ? projectMilestones.find((milestone) => milestone.id === selectedMilestoneId)
    : undefined;
  const visiblePlanTasks = useMemo(() => {
    if (!selectedMilestoneId) return planTasks;
    return planTasks.filter((task) => task.milestoneId === selectedMilestoneId);
  }, [planTasks, selectedMilestoneId]);
  const visibleTaskGroups = useMemo(() => {
    if (!visiblePlanTasks.length) return [] as PlanTaskGroup[];
    const milestoneOrder = new Map(
      projectMilestones.map((milestone, index) => [milestone.id, index]),
    );
    const groups = new Map<string, PlanTaskGroup>();

    visiblePlanTasks.forEach((task) => {
      const key = task.milestoneId || "__whole__";
      const label = task.milestoneId
        ? milestoneTitleById.get(task.milestoneId) ?? "Milestone"
        : "Whole Project";
      const sortOrder = task.milestoneId
        ? (milestoneOrder.get(task.milestoneId) ?? 999)
        : -1;
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(task);
        existing.totalMinutes += task.estimateMinutes;
        return;
      }
      groups.set(key, {
        key,
        label,
        tasks: [task],
        totalMinutes: task.estimateMinutes,
        sortOrder,
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [milestoneTitleById, projectMilestones, visiblePlanTasks]);
  const hasVisiblePlanTasks = visiblePlanTasks.length > 0;
  const newestVisibleTaskId = hasVisiblePlanTasks
    ? visiblePlanTasks[visiblePlanTasks.length - 1].id
    : null;
  const { startRecording, stopRecording, activeRecordingField } = useVoiceRecording();

  const {
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
  } = useAiGeneration(selectedProject?.id, selectedMilestoneId);
  const regeneratingTaskIdSet = useMemo(
    () => new Set(regeneratingTaskIds),
    [regeneratingTaskIds],
  );
  const newlyGeneratedTaskIdSet = useMemo(
    () => new Set(newlyGeneratedTaskIds),
    [newlyGeneratedTaskIds],
  );

  const {
    budgetPulse,
    plannedTick,
    showBudgetOverride,
    setShowBudgetOverride,
    budgetOverrideDraft,
    setBudgetOverrideDraft,
    budgetPercent,
    isOverBudget,
  } = useBudgetDisplay(totalPlanned, budget);

  const milestoneDropdownRef = useRef<HTMLDivElement | null>(null);
  const {
    showStickyRegen,
    setShouldScrollToRegenMessage,
    focusHighlight,
    regenMessageRef,
    aiPromptRef,
  } = useStickyRegenBar(
    milestoneDropdownRef,
    ui.activeView,
    hasVisiblePlanTasks,
    !!aiPrompt,
    !!regenBudgetMessage,
  );

  const shouldShowStickyBar = showStickyRegen && !!selectedProject && hasVisiblePlanTasks;

  const regenDepsRef = useRef({
    totalPlanned,
    budget,
    selectedMilestoneId,
  });
  useEffect(() => {
    if (!regenBudgetMessage) {
      regenDepsRef.current = { totalPlanned, budget, selectedMilestoneId };
      return;
    }
    const prev = regenDepsRef.current;
    const changed =
      prev.totalPlanned !== totalPlanned ||
      prev.budget !== budget ||
      prev.selectedMilestoneId !== selectedMilestoneId;
    if (changed) {
      setRegenBudgetMessage(null);
    }
    regenDepsRef.current = { totalPlanned, budget, selectedMilestoneId };
  }, [totalPlanned, budget, selectedMilestoneId, regenBudgetMessage, setRegenBudgetMessage]);

  useEffect(() => {
    if (projectMilestones.length === 0) return;
    const hidePromptTimeout = window.setTimeout(() => {
      setShowMilestonePrompt(false);
    }, 0);
    return () => window.clearTimeout(hidePromptTimeout);
  }, [projectMilestones.length]);

  useEffect(() => {
    if (!selectedProject || !selectedMilestoneId) return;
    const stillExists = projectMilestones.some(
      (milestone) => milestone.id === selectedMilestoneId,
    );
    if (!stillExists) {
      setPlanMilestoneForProject(selectedProject.id, "");
    }
  }, [projectMilestones, selectedMilestoneId, selectedProject, setPlanMilestoneForProject]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("planning-milestone-change", { detail: selectedMilestoneId }),
    );
  }, [selectedMilestoneId]);

  useEffect(() => {
    const handleSidebarMilestoneSelect = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail ?? "";
      sidebarMilestoneSelectRef.current = true;
      if (!selectedProject) return;
      setPlanMilestoneForProject(selectedProject.id, detail);
    };
    window.addEventListener(
      "planning-milestone-select",
      handleSidebarMilestoneSelect as EventListener,
    );
    return () => {
      window.removeEventListener(
        "planning-milestone-select",
        handleSidebarMilestoneSelect as EventListener,
      );
    };
  }, [selectedProject, setPlanMilestoneForProject]);

  useEffect(() => {
    if (!showBudgetOverride && !hasBudgetOverride) return;
    const existing = activePlan?.timeBudgetOverrideMinutes;
    setBudgetOverrideDraft(typeof existing === "number" ? String(existing) : "");
  }, [showBudgetOverride, hasBudgetOverride, activePlan?.timeBudgetOverrideMinutes, setBudgetOverrideDraft]);

  useEffect(() => {
    const handleTranscript = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) setNotesFromVoice(detail);
    };
    const handleApply = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail) return;
      if (ui.activeView !== "plan") {
        setView("plan");
      }
      setPlanNotes((prev) => (prev ? `${prev}\n${detail}` : detail));
      setNotesFromVoice(null);
    };
    window.addEventListener("global-transcript", handleTranscript as EventListener);
    window.addEventListener("apply-plan-notes", handleApply as EventListener);
    return () => {
      window.removeEventListener("global-transcript", handleTranscript as EventListener);
      window.removeEventListener("apply-plan-notes", handleApply as EventListener);
    };
  }, [setView, ui.activeView]);

  const ensurePlan = () => {
    if (!selectedProject) return;
    if (activePlan) return;
    upsertDailyPlan(createDailyPlan(selectedProject.id, selectedDate));
  };

  const handleAddManualTask = () => {
    if (!selectedProject || !manualTitle.trim()) return;
    ensurePlan();
    const task = createManualTask(
      selectedProject.id,
      manualTitle.trim(),
      manualEstimate,
      selectedMilestoneId,
    );
    addTasks([task]);
    attachTasksToPlan(selectedDate, selectedProject.id, [task.id]);
    setManualTitle("");
    setPendingManualTaskScroll(true);
  };

  const handleRemoveTask = (taskId: string) => {
    if (!selectedProject) return;
    removeTasks([taskId]);
    detachTasksFromPlan(selectedDate, selectedProject.id, [taskId]);
    removeProgressEntriesForTasks([taskId]);
  };

  const handlePlanBudgetOverrideChange = (value: number) => {
    if (!selectedProject) return;
    const clamped = clampPlanBudgetMinutes(value);
    const plan: DailyPlan = activePlan
      ? { ...activePlan, timeBudgetOverrideMinutes: clamped }
      : createDailyPlan(selectedProject.id, selectedDate, clamped);
    upsertDailyPlan(plan);
  };

  const clearPlanBudgetOverride = () => {
    if (!selectedProject || !activePlan) return;
    upsertDailyPlan({ ...activePlan, timeBudgetOverrideMinutes: undefined });
  };

  const handleGenerate = async (skipMilestonePrompt?: boolean) => {
    await handleGenerateTasks({
      notes: planNotes,
      skipMilestonePrompt,
      onRequireMilestonePrompt: () => setShowMilestonePrompt(true),
      setShouldScrollToRegenMessage,
    });
  };

  const handleStickyGenerate = async () => {
    setShouldScrollToRegenMessage(true);
    await handleGenerate();
  };

  useEffect(() => {
    if (!sidebarMilestoneSelectRef.current) return;
    sidebarMilestoneSelectRef.current = false;
    milestoneDropdownRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedMilestoneId]);

  useEffect(() => {
    if (!pendingManualTaskScroll) return;
    const raf = window.requestAnimationFrame(() => {
      newestTaskRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setPendingManualTaskScroll(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pendingManualTaskScroll, hasVisiblePlanTasks, selectedMilestoneId]);

  const handleRunAiGeneration = (remainingBudget: number, removeTaskIds: string[]) => {
    runAiGeneration(remainingBudget, removeTaskIds, planNotes);
  };

  return (
    <section
      className={`grid min-w-0 gap-8 rounded-[32px] bg-[var(--panel)]/70 p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl border border-[var(--paper)] ${selectedProject ? "pb-28" : ""
        }`}
    >
      <div className="grid min-w-0 gap-3">
        <h2 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
          Daily Plan for{" "}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event("open-left-sidebar"));
            }}
            className="font-semibold text-[var(--accent)] transition hover:opacity-80"
          >
            {selectedProject ? selectedProject.name : "your project"}
          </button>
        </h2>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-medium)] bg-white/85 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Working Scope
            </p>
            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-[var(--ink)]">
                {selectedMilestone?.title || "Whole Project"}
              </span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-left-sidebar"))}
                className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:opacity-80"
              >
                Change
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-medium)] bg-white/85 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Time Budget
            </p>
            <div className="mt-1.5">
              <BudgetBar
                totalPlanned={totalPlanned}
                budget={budget}
                isOverBudget={isOverBudget}
                budgetPercent={budgetPercent}
                plannedTick={plannedTick}
                budgetPulse={budgetPulse}
                hasBudgetOverride={hasBudgetOverride}
                showBudgetOverride={showBudgetOverride}
                setShowBudgetOverride={setShowBudgetOverride}
                budgetOverrideDraft={budgetOverrideDraft}
                setBudgetOverrideDraft={setBudgetOverrideDraft}
                onSaveOverride={handlePlanBudgetOverrideChange}
                onClearOverride={clearPlanBudgetOverride}
              />
            </div>
          </div>
        </div>
      </div>

      {!selectedProject && (
        <div className="rounded-2xl border border-dashed border-[rgba(31,45,43,0.2)] p-6 text-sm text-[var(--muted)]">
          Select a project to build a plan.
        </div>
      )}

      {selectedProject && (
        <>
          <div className="flex flex-col gap-3">
            <MilestoneSelector
              showScopeSelector={false}
              projectMilestones={projectMilestones}
              selectedMilestoneId={selectedMilestoneId}
              setSelectedMilestoneId={setSelectedMilestoneId}
              showMilestonePrompt={showMilestonePrompt}
              setShowMilestonePrompt={setShowMilestonePrompt}
              milestoneDropdownRef={milestoneDropdownRef}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              aiScopeWarning={aiScopeWarning}
              aiError={aiError}
              isGeneratingMilestones={isGeneratingMilestones}
              handleProposeMilestones={handleProposeMilestones}
              onContinueWithoutMilestones={() => handleGenerate(true)}
              onRunAiGeneration={handleRunAiGeneration}
              budget={budget}
              setShowBudgetOverride={setShowBudgetOverride}
              setBudgetOverrideDraft={setBudgetOverrideDraft}
              focusHighlight={focusHighlight}
              aiPromptRef={aiPromptRef}
            />

            {isNotesOpen && (
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-medium)] bg-white/90 p-4">
                <label className="text-sm font-semibold text-[var(--muted)]">
                  Today&apos;s Notes
                </label>
                <div className="relative flex min-w-0 items-center rounded-2xl bg-[var(--panel)] shadow-[0_0_0_1px_rgba(31,45,43,0.1)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                  <textarea
                    value={planNotes}
                    onChange={(event) => setPlanNotes(event.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-2xl border-transparent bg-transparent px-4 py-3 placeholder:text-sm focus:outline-none pr-12"
                    placeholder="What should you remember while working today?"
                  />
                  <div className="absolute right-2 top-2">
                    <DictationMic
                      isRecording={activeRecordingField === "planNotes"}
                      onClick={() => {
                        if (activeRecordingField === "planNotes") stopRecording();
                        else
                          startRecording(
                            "planNotes",
                            (text) => setPlanNotes((prev) => (prev ? `${prev}\n${text}` : text)),
                            "Context: These are raw planning notes for the day.",
                          );
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {isManualOpen && (
              <ManualTaskForm
                manualTitle={manualTitle}
                setManualTitle={setManualTitle}
                manualEstimate={manualEstimate}
                setManualEstimate={setManualEstimate}
                onAdd={handleAddManualTask}
                selectedMilestoneTitle={selectedMilestone?.title}
              />
            )}

            {notesFromVoice && (
              <p className="text-xs text-[var(--muted)]">
                Voice capture ready - use the header button to add it to notes.
              </p>
            )}
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setShouldScrollToRegenMessage(true);
                  handleGenerate();
                }}
                className="flex items-center justify-center gap-2 rounded-full bg-[var(--ink)]/90 px-4 py-2 text-[13px] font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-[var(--ink)] disabled:opacity-60"
                disabled={isGenerating}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="overflow-visible" aria-hidden="true">
                  <path d="m5 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                  <path d="m19 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
                </svg>
                {hasVisiblePlanTasks ? "Generate More" : "Generate Tasks"}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddMenuOpen((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--muted)] transition hover:bg-[rgba(31,45,43,0.1)]"
                  title="More actions"
                  aria-label="More actions"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                {addMenuOpen && (
                  <div className="absolute left-0 bottom-full z-20 mb-2 w-48 rounded-xl border border-[var(--border-medium)] bg-[var(--panel)] p-1.5 shadow-lg backdrop-blur">
                    <button
                      type="button"
                      onClick={() => { setIsManualOpen((prev) => !prev); setAddMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--bg-hover)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      {isManualOpen ? "Hide Manual Task" : "Add Manual Task"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsNotesOpen((prev) => !prev); setAddMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--bg-hover)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      {isNotesOpen ? "Hide Notes" : "Today's Notes"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {!hasVisiblePlanTasks && !isGenerating && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-[var(--muted)]">
                  {selectedMilestoneId
                    ? `No tasks yet for "${selectedMilestone?.title ?? "this milestone"}".`
                    : "No tasks yet."}
                </p>
              </div>
            )}
            {visibleTaskGroups.map((group) => (
              <Fragment key={group.key}>
                <div className="flex items-center justify-between rounded-full bg-[var(--panel)] px-4 py-1 text-xs font-medium tracking-wide text-[var(--muted)]">
                  <span>{group.label}</span>
                  <span>
                    {group.tasks.length} tasks - {formatMinutes(group.totalMinutes)}
                  </span>
                </div>
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    ref={task.id === newestVisibleTaskId ? newestTaskRef : undefined}
                  >
                    <TaskCard
                      task={task}
                      mode="plan"
                      onStatusChange={updateTaskStatus}
                      onEstimateChange={updateTaskEstimate}
                      onTogglePin={toggleTaskPinned}
                      onUpdateDetails={updateTaskDetails}
                      onRemove={handleRemoveTask}
                      onFocus={(id) => {
                        setFocusTask(id);
                        setView("focus");
                      }}
                      isRegenerating={regeneratingTaskIdSet.has(task.id)}
                      isNewlyGenerated={newlyGeneratedTaskIdSet.has(task.id)}
                    />
                  </div>
                ))}
              </Fragment>
            ))}
            {isGenerating && (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[rgba(95,143,162,0.45)] bg-[var(--info-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--info)]">
                  <span
                    className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[rgba(95,143,162,0.32)] border-t-[var(--info)]"
                    aria-hidden="true"
                  />
                  Generating tasks for this list...
                </div>
                {Array.from({ length: hasVisiblePlanTasks ? 2 : 3 }).map((_, index) => (
                  <div
                    key={`pending-generated-task-${index}`}
                    className="grid gap-2 rounded-2xl border border-dashed border-[rgba(95,143,162,0.38)] bg-white/85 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(31,45,43,0.42)] animate-pulse"
                    aria-hidden="true"
                  >
                    <div className="h-2 w-1/3 rounded-full bg-[var(--border-medium)]" />
                    <div className="h-2 w-11/12 rounded-full bg-[var(--border-medium)]" />
                    <div className="h-2 w-2/3 rounded-full bg-[var(--border-medium)]" />
                  </div>
                ))}
              </>
            )}
          </div>

          {regenBudgetMessage && (
            <div
              ref={regenMessageRef}
              className={focusHighlight === "regenMessage" ? "attention-highlight rounded-xl" : ""}
            >
              <p className="text-xs text-[var(--ink)]">{regenBudgetMessage}</p>
            </div>
          )}
        </>
      )}

      <StickyRegenBar
        show={shouldShowStickyBar}
        projectMilestones={projectMilestones}
        selectedMilestoneId={selectedMilestoneId}
        setSelectedMilestoneId={setSelectedMilestoneId}
        onGenerate={handleStickyGenerate}
        isGenerating={isGenerating}
      />
    </section>
  );
}
