"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { isoToday } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { DailyPlan, Task } from "@/lib/types";
import { selectAiBatchMeta } from "@/lib/selectors";
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

const getAiBatchKey = (task: Task) => {
  if (task.source !== "ai") return null;
  return task.aiBatchId ?? `legacy-${task.milestoneId ?? "whole"}`;
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
  const hasPlanTasks = planTasks.length > 0;

  const projectMilestones = useMemo(() => {
    if (!selectedProject) return [];
    return milestones.filter((milestone) => milestone.projectId === selectedProject.id);
  }, [milestones, selectedProject]);
  const selectedMilestone = selectedMilestoneId
    ? projectMilestones.find((milestone) => milestone.id === selectedMilestoneId)
    : undefined;

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
    hasPlanTasks,
    !!aiPrompt,
    !!regenBudgetMessage,
  );

  const shouldShowStickyBar = showStickyRegen && !!selectedProject && hasPlanTasks;

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

  const milestoneTitleById = useMemo(() => {
    const map = new Map<string, string>();
    projectMilestones.forEach((milestone) => map.set(milestone.id, milestone.title));
    return map;
  }, [projectMilestones]);

  const aiBatchMeta = useMemo(
    () => selectAiBatchMeta(planTasks, milestoneTitleById),
    [planTasks, milestoneTitleById],
  );
  const planTaskRows = useMemo(() => {
    const seenBatches = new Set<string>();
    return planTasks.map((task, index) => {
      const batchKey = getAiBatchKey(task);
      const showBatchHeader = !!batchKey && !seenBatches.has(batchKey);
      if (showBatchHeader && batchKey) {
        seenBatches.add(batchKey);
      }
      return {
        task,
        batchMeta: batchKey ? aiBatchMeta.get(batchKey) : undefined,
        showBatchHeader,
        isNewestTask: index === planTasks.length - 1,
      };
    });
  }, [aiBatchMeta, planTasks]);

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
    if (!pendingManualTaskScroll || planTasks.length === 0) return;
    const raf = window.requestAnimationFrame(() => {
      newestTaskRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setPendingManualTaskScroll(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pendingManualTaskScroll, planTasks.length]);

  const handleRunAiGeneration = (remainingBudget: number, removeTaskIds: string[]) => {
    runAiGeneration(remainingBudget, removeTaskIds, planNotes);
  };

  return (
    <section
      className={`grid min-w-0 gap-6 rounded-[28px] bg-white/80 p-4 sm:p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)] ${
        selectedProject ? "pb-28" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl mb-2">
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
          <p className="text-sm text-[var(--muted)]">
            Generate, review, and organize today&apos;s tasks and notes for one focused project.
          </p>
        </div>
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

      {!selectedProject && (
        <div className="rounded-2xl border border-dashed border-[rgba(15,23,42,0.2)] p-6 text-sm text-[var(--muted)]">
          Select a project to build a plan.
        </div>
      )}

      {selectedProject && (
        <>
          <div className="flex flex-col gap-3">
            <MilestoneSelector
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--muted)]">
                Today&apos;s Notes
              </label>
              <div className="relative flex min-w-0 items-center rounded-2xl bg-[var(--panel)] shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
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
              {notesFromVoice && (
                <p className="text-xs text-[var(--muted)]">
                  Voice capture ready — use the header button to add it to notes.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            <div className="h-px flex-1 bg-[rgba(15,23,42,0.12)]" />
            <span>Manual Tasks</span>
            <div className="h-px flex-1 bg-[rgba(15,23,42,0.12)]" />
          </div>

          <ManualTaskForm
            manualTitle={manualTitle}
            setManualTitle={setManualTitle}
            manualEstimate={manualEstimate}
            setManualEstimate={setManualEstimate}
            onAdd={handleAddManualTask}
            selectedMilestoneTitle={selectedMilestone?.title}
          />

          <div className="grid min-w-0 gap-3">
            {planTasks.length === 0 && !isGenerating && (
              <p className="text-sm text-[var(--muted)]">No tasks yet for this day.</p>
            )}
            {planTaskRows.map(({ task, batchMeta, showBatchHeader, isNewestTask }) => (
              <Fragment key={task.id}>
                {showBatchHeader && batchMeta && (
                  <div className="rounded-full bg-[var(--panel)] px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {batchMeta.label} ·{" "}
                    {new Date(batchMeta.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                <div ref={isNewestTask ? newestTaskRef : undefined}>
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
              </Fragment>
            ))}
            {isGenerating && (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-sky-300/80 bg-sky-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                  <span
                    className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600"
                    aria-hidden="true"
                  />
                  Generating tasks for this list...
                </div>
                {Array.from({ length: planTasks.length === 0 ? 3 : 2 }).map((_, index) => (
                  <div
                    key={`pending-generated-task-${index}`}
                    className="grid gap-2 rounded-2xl border border-dashed border-sky-300/75 bg-white/85 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.5)] animate-pulse"
                    aria-hidden="true"
                  >
                    <div className="h-2 w-1/3 rounded-full bg-slate-300/80" />
                    <div className="h-2 w-11/12 rounded-full bg-slate-300/80" />
                    <div className="h-2 w-2/3 rounded-full bg-slate-300/80" />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setShouldScrollToRegenMessage(true);
                handleGenerate();
              }}
              className="flex items-center justify-center gap-2 self-start rounded-full bg-[var(--accent)] px-5 py-3 text-xs uppercase tracking-[0.25em] text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={isGenerating}
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
                className="overflow-visible"
                aria-hidden="true"
              >
                <path d="m5 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                <path d="m19 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
              </svg>
              {isGenerating ? "Generating..." : "Generate Tasks"}
            </button>
            <p className="text-xs text-[var(--muted)]">
              AI generation respects your pinned tasks and budget constraints.
            </p>
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
