import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Milestone } from "@/lib/types";

type AiPromptState = {
  mode: "regenerate" | "budgetFull";
  pinnedCount: number;
  unpinnedCount: number;
  remainingAppend: number;
  remainingReplace: number;
  remainingReplaceAll: number;
  removeTaskIds: string[];
  removeAllTaskIds: string[];
};

type MilestoneSelectorProps = {
  projectMilestones: Milestone[];
  selectedMilestoneId: string;
  setSelectedMilestoneId: (value: string) => void;
  showMilestonePrompt: boolean;
  setShowMilestonePrompt: (value: boolean) => void;
  milestoneDropdownRef: RefObject<HTMLDivElement | null>;
  aiPrompt: AiPromptState | null;
  setAiPrompt: (value: AiPromptState | null) => void;
  aiScopeWarning: string | null;
  aiError: string | null;
  isGeneratingMilestones: boolean;
  handleProposeMilestones: () => void;
  onContinueWithoutMilestones: () => void;
  onRunAiGeneration: (remainingBudget: number, removeTaskIds: string[]) => void;
  budget: number;
  setShowBudgetOverride: (value: boolean) => void;
  setBudgetOverrideDraft: (value: string) => void;
  focusHighlight: "aiPrompt" | "regenMessage" | null;
  aiPromptRef: RefObject<HTMLDivElement | null>;
};

export default function MilestoneSelector({
  projectMilestones,
  selectedMilestoneId,
  setSelectedMilestoneId,
  showMilestonePrompt,
  setShowMilestonePrompt,
  milestoneDropdownRef,
  aiPrompt,
  setAiPrompt,
  aiScopeWarning,
  aiError,
  isGeneratingMilestones,
  handleProposeMilestones,
  onContinueWithoutMilestones,
  onRunAiGeneration,
  budget,
  setShowBudgetOverride,
  setBudgetOverrideDraft,
  focusHighlight,
  aiPromptRef,
}: MilestoneSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedLabel = useMemo(() => {
    if (!selectedMilestoneId) return "Whole Project";
    return (
      projectMilestones.find((milestone) => milestone.id === selectedMilestoneId)?.title ??
      "Whole Project"
    );
  }, [projectMilestones, selectedMilestoneId]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (milestoneDropdownRef.current?.contains(target)) return;
      setIsDropdownOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen, milestoneDropdownRef]);

  useEffect(() => {
    if (isDropdownOpen) setIsDropdownOpen(false);
  }, [selectedMilestoneId]);

  return (
    <div ref={milestoneDropdownRef} className="flex flex-col gap-2 pb-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--ink)]">Generate tasks for</span>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex w-full items-start justify-between gap-2 rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 text-left text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <span className="min-w-0 flex-1 break-words whitespace-normal">
              {selectedLabel}
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
              className={`mt-1 shrink-0 transition ${isDropdownOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {isDropdownOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/95 p-2 shadow-lg backdrop-blur"
            >
              <button
                type="button"
                role="option"
                aria-selected={!selectedMilestoneId}
                className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--panel)]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSelectedMilestoneId("")}
              >
                <span className="min-w-0 flex-1 break-words whitespace-normal">
                  Whole Project
                </span>
                {!selectedMilestoneId && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Active
                  </span>
                )}
              </button>
              {projectMilestones.map((milestone) => (
                <button
                  key={milestone.id}
                  type="button"
                  role="option"
                  aria-selected={selectedMilestoneId === milestone.id}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--panel)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setSelectedMilestoneId(milestone.id)}
                >
                  <span className="min-w-0 flex-1 break-words whitespace-normal">
                    {milestone.title}
                  </span>
                  {selectedMilestoneId === milestone.id && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Choose a milestone to focus on, or plan across the whole project.
      </p>

      {projectMilestones.length === 0 && !showMilestonePrompt && (
        <div className="rounded-xl border border-dashed border-[rgba(15,23,42,0.15)] bg-white/70 p-3 text-xs text-[var(--muted)]">
          No milestones yet. Add one or ask AI to propose some before generating tasks.
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => document.getElementById("new-milestone-input")?.focus()}
              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              Add milestone
            </button>
            <button
              type="button"
              onClick={handleProposeMilestones}
              disabled={isGeneratingMilestones}
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:-translate-y-0.5"
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
              onClick={() => document.getElementById("new-milestone-input")?.focus()}
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
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:-translate-y-0.5 disabled:opacity-60"
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
              {isGeneratingMilestones ? "Thinking..." : "AI propose milestones"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMilestonePrompt(false);
                onContinueWithoutMilestones();
              }}
              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              Continue with Whole Project
            </button>
          </div>
        </div>
      )}

      {aiPrompt && (
        <div
          ref={aiPromptRef}
          className={`rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white/90 p-4 text-xs text-[var(--ink)] ${
            focusHighlight === "aiPrompt" ? "attention-highlight" : ""
          }`}
        >
          <p className="text-[var(--ink)] font-semibold">
            You&apos;re about to replace one of your milestone tasks by another&apos;s.
          </p>
          <p className="mt-1 text-[var(--muted)]">
            Pin any tasks you want to preserve before continuing.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={aiPrompt.unpinnedCount === 0 || aiPrompt.remainingReplace <= 0}
              onClick={() => {
                const next = aiPrompt;
                setAiPrompt(null);
                onRunAiGeneration(next.remainingReplace, next.removeTaskIds);
              }}
              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              Replace Unpinned Tasks
            </button>
            {aiPrompt.mode === "budgetFull" && (
              <button
                type="button"
                onClick={() => {
                  setAiPrompt(null);
                  setBudgetOverrideDraft(`${budget || ""}`);
                  setShowBudgetOverride(true);
                }}
                className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Adjust today&apos;s time
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiPrompt(null)}
              className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:-translate-y-0.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {aiScopeWarning && <p className="text-xs text-amber-700">{aiScopeWarning}</p>}
      {aiError && <p className="text-xs text-red-600">{aiError}</p>}
    </div>
  );
}
