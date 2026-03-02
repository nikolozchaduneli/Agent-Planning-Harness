import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Milestone } from "@/lib/types";

type AiPromptState = {
  mode: "regenerate" | "budgetFull" | "crossReplace";
  pinnedCount: number;
  unpinnedCount: number;
  remainingAppend: number;
  remainingReplace: number;
  remainingReplaceAll: number;
  removeTaskIds: string[];
  removeAllTaskIds: string[];
};

type MilestoneSelectorProps = {
  showScopeSelector?: boolean;
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
  showScopeSelector = true,
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

  return (
    <div ref={milestoneDropdownRef} className="flex flex-col gap-2 pb-3">
      {showScopeSelector && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex w-full items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel)] px-4 py-3 text-left text-[14px] font-medium text-[var(--ink)] transition hover:bg-white focus:outline-none"
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
                className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[rgba(31,45,43,0.08)] bg-white/95 p-2 shadow-lg backdrop-blur"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedMilestoneId}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--panel)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedMilestoneId("");
                    setIsDropdownOpen(false);
                  }}
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
                    onClick={() => {
                      setSelectedMilestoneId(milestone.id);
                      setIsDropdownOpen(false);
                    }}
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
      )}

      {projectMilestones.length === 0 && (
        <div className="rounded-xl border border-dashed border-[rgba(31,45,43,0.15)] bg-white/70 p-3 text-xs text-[var(--muted)]">
          No milestones yet. Add one or ask AI to propose some before generating tasks.
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => document.getElementById("new-milestone-input")?.focus()}
              className="rounded-full border border-[rgba(31,45,43,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              Add milestone
            </button>
            <button
              type="button"
              onClick={() => {
                handleProposeMilestones();
                if (showMilestonePrompt) setShowMilestonePrompt(false);
              }}
              disabled={isGeneratingMilestones}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-medium)] bg-[var(--panel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:bg-white disabled:opacity-60"
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
            {showMilestonePrompt && (
              <button
                type="button"
                onClick={() => {
                  setShowMilestonePrompt(false);
                  onContinueWithoutMilestones();
                }}
                className="rounded-full border border-[rgba(31,45,43,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
              >
                Continue with Whole Project
              </button>
            )}
          </div>
        </div>
      )}

      {aiPrompt && (
        <div
          ref={aiPromptRef}
          className={`rounded-2xl border border-[rgba(31,45,43,0.12)] bg-white/90 p-4 text-xs text-[var(--ink)] ${focusHighlight === "aiPrompt" ? "attention-highlight" : ""
            }`}
        >
          <p className="text-[var(--ink)] font-semibold">
            {aiPrompt.mode === "budgetFull"
              ? "Today's plan is full. Extend today's time to continue."
              : aiPrompt.mode === "crossReplace"
                ? "Today's plan is full. Extend today's time or replace unpinned tasks from other milestones."
                : "Replace unpinned tasks in this milestone?"}
          </p>
          <p className="mt-1 text-[var(--muted)]">
            {aiPrompt.mode === "budgetFull"
              ? "No replaceable unpinned tasks are available in this scope."
              : aiPrompt.mode === "crossReplace"
                ? "We'll remove unpinned AI to-do tasks in other milestones and generate tasks for this milestone."
                : "We'll remove unpinned AI to-do tasks in this milestone before generating new ones. Pin any tasks you want to preserve first."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {aiPrompt.mode === "regenerate" && (
              <button
                type="button"
                disabled={aiPrompt.unpinnedCount === 0 || aiPrompt.remainingReplace <= 0}
                onClick={() => {
                  const next = aiPrompt;
                  setAiPrompt(null);
                  onRunAiGeneration(next.remainingReplace, next.removeTaskIds);
                }}
                className="rounded-full border border-[rgba(31,45,43,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Replace Unpinned Tasks
              </button>
            )}
            {aiPrompt.mode === "crossReplace" && (
              <button
                type="button"
                disabled={aiPrompt.unpinnedCount === 0 || aiPrompt.remainingReplace <= 0}
                onClick={() => {
                  const next = aiPrompt;
                  setAiPrompt(null);
                  onRunAiGeneration(next.remainingReplace, next.removeTaskIds);
                }}
                className="rounded-full border border-[rgba(31,45,43,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Replace Unpinned From Other Milestones
              </button>
            )}
            {(aiPrompt.mode === "budgetFull" || aiPrompt.mode === "crossReplace") && (
              <button
                type="button"
                onClick={() => {
                  setAiPrompt(null);
                  setBudgetOverrideDraft(`${budget || ""}`);
                  setShowBudgetOverride(true);
                }}
                className="rounded-full bg-[var(--ink)] border border-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Extend today&apos;s time
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiPrompt(null)}
              className="rounded-full border border-[rgba(31,45,43,0.15)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:-translate-y-0.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {aiScopeWarning && <p className="text-xs text-[var(--warning)]">{aiScopeWarning}</p>}
      {aiError && <p className="text-xs text-red-600">{aiError}</p>}
    </div>
  );
}
